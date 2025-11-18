import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { db } from '../models/database';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = db.getUserById(decoded.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.userId = decoded.userId;
  next();
};
