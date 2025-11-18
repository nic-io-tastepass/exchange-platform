import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
};

export const generateMFAToken = (userId: string): string => {
  return jwt.sign({ userId, mfa: true }, JWT_SECRET, { expiresIn: '5m' });
};

export const verifyMFAToken = (token: string): { userId: string; mfa: boolean } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; mfa: boolean };
    if (decoded.mfa) return decoded;
    return null;
  } catch {
    return null;
  }
};
