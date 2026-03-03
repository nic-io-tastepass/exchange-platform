const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  name: string;
  totpEnabled: boolean;
  hasWebAuthn: boolean;
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  type: 'good' | 'interest';
  images: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
}

export interface Offer {
  id: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  offerDetails: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  listing?: { id: string; title: string };
  fromUser?: { id: string; name: string };
  toUser?: { id: string; name: string };
}

export interface Thread {
  id: string;
  participants: string[];
  listingId?: string;
  createdAt: string;
  updatedAt: string;
  otherUser?: { id: string; name: string };
  lastMessage?: Message;
  messageCount: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; name: string };
}

export interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxListings: number;
  highlighted: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  revolutOrderId?: string;
  description?: string;
  createdAt: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async register(email: string, password: string, name: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async setupTOTP() {
    return this.request('/api/auth/mfa/totp/setup', { method: 'POST' });
  }

  async verifyTOTP(token: string) {
    return this.request('/api/auth/mfa/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async authenticateTOTP(mfaToken: string, token: string) {
    const data = await this.request('/api/auth/mfa/totp/authenticate', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, token }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async disableTOTP() {
    return this.request('/api/auth/mfa/totp', { method: 'DELETE' });
  }

  async getWebAuthnRegisterOptions() {
    return this.request('/api/auth/webauthn/register/options', { method: 'POST' });
  }

  async verifyWebAuthnRegistration(credential: any) {
    return this.request('/api/auth/webauthn/register/verify', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  }

  async getWebAuthnAuthOptions(email: string) {
    return this.request('/api/auth/webauthn/authenticate/options', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyWebAuthnAuth(email: string, credential: any) {
    const data = await this.request('/api/auth/webauthn/authenticate/verify', {
      method: 'POST',
      body: JSON.stringify({ email, ...credential }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getListings(filters?: { category?: string; type?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/listings${query}`);
  }

  async getListing(id: string) {
    return this.request(`/api/listings/${id}`);
  }

  async createListing(listing: {
    title: string;
    description: string;
    category: string;
    type: 'good' | 'interest';
    images?: string[];
  }) {
    return this.request('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
  }

  async updateListing(id: string, updates: any) {
    return this.request(`/api/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getOffers() {
    return this.request('/api/offers');
  }

  async createOffer(offer: { listingId: string; message: string; offerDetails: string }) {
    return this.request('/api/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
  }

  async acceptOffer(id: string) {
    return this.request(`/api/offers/${id}/accept`, { method: 'POST' });
  }

  async declineOffer(id: string) {
    return this.request(`/api/offers/${id}/decline`, { method: 'POST' });
  }

  async getThreads() {
    return this.request('/api/messages/threads');
  }

  async createThread(participantId: string, listingId?: string) {
    return this.request('/api/messages/threads', {
      method: 'POST',
      body: JSON.stringify({ participantId, listingId }),
    });
  }

  async getMessages(threadId: string) {
    return this.request(`/api/messages/threads/${threadId}/messages`);
  }

  async sendMessage(threadId: string, content: string) {
    return this.request(`/api/messages/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateUser(updates: { name: string }) {
    return this.request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ── Billing ──────────────────────────────────────────────────────────

  async getPlans(): Promise<Plan[]> {
    return this.request('/api/billing/plans');
  }

  async getSubscription(): Promise<{ subscription: Subscription | null }> {
    return this.request('/api/billing/subscription');
  }

  async subscribe(planId: string, billingInterval: 'monthly' | 'yearly') {
    return this.request('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId, billingInterval }),
    });
  }

  async cancelSubscription() {
    return this.request('/api/billing/cancel', { method: 'POST' });
  }

  async resumeSubscription() {
    return this.request('/api/billing/resume', { method: 'POST' });
  }

  async getPayments(): Promise<Payment[]> {
    return this.request('/api/billing/payments');
  }

  async getBillingConfig(): Promise<{ revolutConfigured: boolean }> {
    return this.request('/api/billing/config');
  }
}

export const api = new ApiClient();
