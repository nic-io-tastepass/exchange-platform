import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Offer } from '../types';

const router = express.Router();

router.get('/', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const offers = db.getOffersByUser(req.userId!);
    
    const offersWithDetails = offers.map(offer => {
      const listing = db.getListingById(offer.listingId);
      const fromUser = db.getUserById(offer.fromUserId);
      const toUser = db.getUserById(offer.toUserId);
      
      return {
        ...offer,
        listing: listing ? { id: listing.id, title: listing.title } : null,
        fromUser: fromUser ? { id: fromUser.id, name: fromUser.name } : null,
        toUser: toUser ? { id: toUser.id, name: toUser.name } : null,
      };
    });

    res.json(offersWithDetails);
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

router.get('/:id', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const offer = db.getOfferById(req.params.id);
    
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.fromUserId !== req.userId && offer.toUserId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to view this offer' });
      return;
    }

    const listing = db.getListingById(offer.listingId);
    const fromUser = db.getUserById(offer.fromUserId);
    const toUser = db.getUserById(offer.toUserId);

    res.json({
      ...offer,
      listing,
      fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email } : null,
      toUser: toUser ? { id: toUser.id, name: toUser.name, email: toUser.email } : null,
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

router.post('/', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { listingId, message, offerDetails } = req.body;

    if (!listingId || !message || !offerDetails) {
      res.status(400).json({ error: 'Listing ID, message, and offer details are required' });
      return;
    }

    const listing = db.getListingById(listingId);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.userId === req.userId) {
      res.status(400).json({ error: 'Cannot make an offer on your own listing' });
      return;
    }

    const offer: Offer = {
      id: uuidv4(),
      listingId,
      fromUserId: req.userId!,
      toUserId: listing.userId,
      message,
      offerDetails,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.createOffer(offer);

    res.status(201).json(offer);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

router.post('/:id/accept', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const offer = db.getOfferById(req.params.id);
    
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.toUserId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to accept this offer' });
      return;
    }

    if (offer.status !== 'pending') {
      res.status(400).json({ error: 'Offer is not pending' });
      return;
    }

    const updated = db.updateOffer(req.params.id, { status: 'accepted' });

    res.json(updated);
  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

router.post('/:id/decline', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const offer = db.getOfferById(req.params.id);
    
    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (offer.toUserId !== req.userId) {
      res.status(403).json({ error: 'Not authorized to decline this offer' });
      return;
    }

    if (offer.status !== 'pending') {
      res.status(400).json({ error: 'Offer is not pending' });
      return;
    }

    const updated = db.updateOffer(req.params.id, { status: 'declined' });

    res.json(updated);
  } catch (error) {
    console.error('Decline offer error:', error);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
});

export default router;
