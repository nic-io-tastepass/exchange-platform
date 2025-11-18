import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Listing } from '../types';

const router = express.Router();

router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const { category, type, userId } = req.query;
    
    const filters: any = {};
    if (category) filters.category = category as string;
    if (type) filters.type = type as string;
    if (userId) filters.userId = userId as string;

    const listings = db.getListings(filters);
    
    const listingsWithUser = listings.map(listing => {
      const user = db.getUserById(listing.userId);
      return {
        ...listing,
        user: user ? { id: user.id, name: user.name } : null,
      };
    });

    res.json(listingsWithUser);
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const listing = db.getListingById(req.params.id);
    
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const user = db.getUserById(listing.userId);
    
    res.json({
      ...listing,
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
    });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { title, description, category, type, images } = req.body;

    if (!title || !description || !category || !type) {
      res.status(400).json({ error: 'Title, description, category, and type are required' });
      return;
    }

    if (type !== 'good' && type !== 'interest') {
      res.status(400).json({ error: 'Type must be either "good" or "interest"' });
      return;
    }

    const listing: Listing = {
      id: uuidv4(),
      userId: req.userId!,
      title,
      description,
      category,
      type,
      images: images || [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.createListing(listing);

    res.status(201).json(listing);
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

router.patch('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const listing = db.getListingById(req.params.id);
    
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.userId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to update this listing' });
      return;
    }

    const { title, description, category, images, status } = req.body;
    
    const updates: Partial<Listing> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (images !== undefined) updates.images = images;
    if (status !== undefined) updates.status = status;

    const updated = db.updateListing(req.params.id, updates);

    res.json(updated);
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

export default router;
