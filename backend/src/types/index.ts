import { AuthenticatorDevice } from '@simplewebauthn/server/script/deps';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  totpSecret?: string;
  totpEnabled: boolean;
  webauthnCredentials: AuthenticatorDevice[];
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  type: 'good' | 'interest';
  images: string[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  offerDetails: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Thread {
  id: string;
  participants: string[];
  listingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  fromUserId: string;
  toUserId: string;
  offerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
