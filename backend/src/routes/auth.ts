import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { db } from '../models/database';
import { hashPassword, comparePassword, generateToken, generateMFAToken, verifyMFAToken } from '../utils/auth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User } from '../types';

const router = express.Router();

const RP_NAME = process.env.RP_NAME || 'Exchange Platform';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
      totpEnabled: false,
      webauthnCredentials: [],
    };

    db.createUser(user);

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        totpEnabled: user.totpEnabled,
        hasWebAuthn: user.webauthnCredentials.length > 0,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.totpEnabled) {
      const mfaToken = generateMFAToken(user.id);
      res.json({
        mfaRequired: true,
        mfaToken,
        methods: ['totp'],
      });
      return;
    }

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        totpEnabled: user.totpEnabled,
        hasWebAuthn: user.webauthnCredentials.length > 0,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  const user = db.getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    totpEnabled: user.totpEnabled,
    hasWebAuthn: user.webauthnCredentials.length > 0,
  });
});

router.post('/mfa/totp/setup', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = db.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.totpEnabled) {
      res.status(400).json({ error: 'TOTP already enabled' });
      return;
    }

    const secret = speakeasy.generateSecret({
      name: `${RP_NAME} (${user.email})`,
      issuer: RP_NAME,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    db.updateUser(user.id, { totpSecret: secret.base32 });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    res.status(500).json({ error: 'TOTP setup failed' });
  }
});

router.post('/mfa/totp/verify', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { token } = req.body;
    const user = db.getUserById(req.userId!);

    if (!user || !user.totpSecret) {
      res.status(400).json({ error: 'TOTP not set up' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      res.status(400).json({ error: 'Invalid TOTP code' });
      return;
    }

    db.updateUser(user.id, { totpEnabled: true });

    res.json({ message: 'TOTP enabled successfully' });
  } catch (error) {
    console.error('TOTP verification error:', error);
    res.status(500).json({ error: 'TOTP verification failed' });
  }
});

router.post('/mfa/totp/authenticate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mfaToken, token } = req.body;

    if (!mfaToken || !token) {
      res.status(400).json({ error: 'MFA token and TOTP code are required' });
      return;
    }

    const decoded = verifyMFAToken(mfaToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired MFA token' });
      return;
    }

    const user = db.getUserById(decoded.userId);
    if (!user || !user.totpSecret) {
      res.status(400).json({ error: 'TOTP not enabled' });
      return;
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      res.status(400).json({ error: 'Invalid TOTP code' });
      return;
    }

    const authToken = generateToken(user.id);
    res.cookie('token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        totpEnabled: user.totpEnabled,
        hasWebAuthn: user.webauthnCredentials.length > 0,
      },
      token: authToken,
    });
  } catch (error) {
    console.error('TOTP authentication error:', error);
    res.status(500).json({ error: 'TOTP authentication failed' });
  }
});

router.delete('/mfa/totp', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const user = db.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.updateUser(user.id, { totpSecret: undefined, totpEnabled: false });

    res.json({ message: 'TOTP disabled successfully' });
  } catch (error) {
    console.error('TOTP disable error:', error);
    res.status(500).json({ error: 'TOTP disable failed' });
  }
});

router.post('/webauthn/register/options', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = db.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userIDBuffer = Buffer.from(user.id);
    
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userIDBuffer,
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred',
      },
      excludeCredentials: user.webauthnCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),
    });

    db.setWebAuthnChallenge(user.id, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('WebAuthn registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

router.post('/webauthn/register/verify', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = db.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const expectedChallenge = db.getWebAuthnChallenge(user.id);
    if (!expectedChallenge) {
      res.status(400).json({ error: 'No challenge found' });
      return;
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: 'Verification failed' });
      return;
    }

    const { credential } = verification.registrationInfo;

    const newCredential = {
      credentialID: credential.id,
      credentialPublicKey: credential.publicKey,
      counter: credential.counter,
      transports: req.body.response.transports || [],
    };

    const updatedCredentials = [...user.webauthnCredentials, newCredential];
    db.updateUser(user.id, { webauthnCredentials: updatedCredentials });
    db.deleteWebAuthnChallenge(user.id);

    res.json({ verified: true, message: 'Biometric authentication registered successfully' });
  } catch (error) {
    console.error('WebAuthn registration verification error:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
});

router.post('/webauthn/authenticate/options', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user || user.webauthnCredentials.length === 0) {
      res.status(400).json({ error: 'No biometric credentials found' });
      return;
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: user.webauthnCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    });

    db.setWebAuthnChallenge(user.id, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('WebAuthn authentication options error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

router.post('/webauthn/authenticate/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const expectedChallenge = db.getWebAuthnChallenge(user.id);
    if (!expectedChallenge) {
      res.status(400).json({ error: 'No challenge found' });
      return;
    }

    const credentialID = req.body.id;
    const credential = user.webauthnCredentials.find(
      cred => Buffer.from(cred.credentialID).toString('base64url') === credentialID
    );

    if (!credential) {
      res.status(400).json({ error: 'Credential not found' });
      return;
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.credentialID,
        publicKey: credential.credentialPublicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    if (!verification.verified) {
      res.status(400).json({ error: 'Verification failed' });
      return;
    }

    const updatedCredentials = user.webauthnCredentials.map(cred =>
      Buffer.from(cred.credentialID).toString('base64url') === credentialID
        ? { ...cred, counter: verification.authenticationInfo.newCounter }
        : cred
    );

    db.updateUser(user.id, { webauthnCredentials: updatedCredentials });
    db.deleteWebAuthnChallenge(user.id);

    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      verified: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        totpEnabled: user.totpEnabled,
        hasWebAuthn: user.webauthnCredentials.length > 0,
      },
      token,
    });
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
});

export default router;
