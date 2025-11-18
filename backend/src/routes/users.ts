import express, { Response } from 'express';
import { db } from '../models/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const user = db.getUserById(req.userId!);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      totpEnabled: user.totpEnabled,
      hasWebAuthn: user.webauthnCredentials.length > 0,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const updated = db.updateUser(req.userId!, { name });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      createdAt: updated.createdAt,
      totpEnabled: updated.totpEnabled,
      hasWebAuthn: updated.webauthnCredentials.length > 0,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
