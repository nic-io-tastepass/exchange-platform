import { User, Listing, Offer, Thread, Message, Review } from '../types';

class InMemoryDatabase {
  private users: Map<string, User> = new Map();
  private listings: Map<string, Listing> = new Map();
  private offers: Map<string, Offer> = new Map();
  private threads: Map<string, Thread> = new Map();
  private messages: Map<string, Message> = new Map();
  private reviews: Map<string, Review> = new Map();
  private webauthnChallenges: Map<string, string> = new Map();

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  getListings(filters?: { category?: string; type?: string; userId?: string }): Listing[] {
    let listings = Array.from(this.listings.values());
    
    if (filters?.category) {
      listings = listings.filter(l => l.category === filters.category);
    }
    if (filters?.type) {
      listings = listings.filter(l => l.type === filters.type);
    }
    if (filters?.userId) {
      listings = listings.filter(l => l.userId === filters.userId);
    }
    
    return listings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getListingById(id: string): Listing | undefined {
    return this.listings.get(id);
  }

  createListing(listing: Listing): Listing {
    this.listings.set(listing.id, listing);
    return listing;
  }

  updateListing(id: string, updates: Partial<Listing>): Listing | undefined {
    const listing = this.listings.get(id);
    if (!listing) return undefined;
    const updated = { ...listing, ...updates, updatedAt: new Date() };
    this.listings.set(id, updated);
    return updated;
  }

  getOffersByUser(userId: string): Offer[] {
    return Array.from(this.offers.values())
      .filter(o => o.fromUserId === userId || o.toUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getOfferById(id: string): Offer | undefined {
    return this.offers.get(id);
  }

  createOffer(offer: Offer): Offer {
    this.offers.set(offer.id, offer);
    return offer;
  }

  updateOffer(id: string, updates: Partial<Offer>): Offer | undefined {
    const offer = this.offers.get(id);
    if (!offer) return undefined;
    const updated = { ...offer, ...updates, updatedAt: new Date() };
    this.offers.set(id, updated);
    return updated;
  }

  getThreadsByUser(userId: string): Thread[] {
    return Array.from(this.threads.values())
      .filter(t => t.participants.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getThreadById(id: string): Thread | undefined {
    return this.threads.get(id);
  }

  createThread(thread: Thread): Thread {
    this.threads.set(thread.id, thread);
    return thread;
  }

  updateThread(id: string, updates: Partial<Thread>): Thread | undefined {
    const thread = this.threads.get(id);
    if (!thread) return undefined;
    const updated = { ...thread, ...updates, updatedAt: new Date() };
    this.threads.set(id, updated);
    return updated;
  }

  getMessagesByThread(threadId: string): Message[] {
    return Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  createMessage(message: Message): Message {
    this.messages.set(message.id, message);
    const thread = this.threads.get(message.threadId);
    if (thread) {
      this.updateThread(message.threadId, { updatedAt: new Date() });
    }
    return message;
  }

  getReviewsByUser(userId: string): Review[] {
    return Array.from(this.reviews.values())
      .filter(r => r.toUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  createReview(review: Review): Review {
    this.reviews.set(review.id, review);
    return review;
  }

  setWebAuthnChallenge(userId: string, challenge: string): void {
    this.webauthnChallenges.set(userId, challenge);
  }

  getWebAuthnChallenge(userId: string): string | undefined {
    return this.webauthnChallenges.get(userId);
  }

  deleteWebAuthnChallenge(userId: string): void {
    this.webauthnChallenges.delete(userId);
  }
}

export const db = new InMemoryDatabase();
