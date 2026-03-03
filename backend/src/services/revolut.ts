/**
 * Revolut Merchant API integration service.
 *
 * Uses the Revolut Merchant API to create payment orders
 * and manage payment lifecycle for subscriptions.
 *
 * Required env vars:
 *   REVOLUT_API_KEY        – Merchant API secret key
 *   REVOLUT_SANDBOX        – "true" to use sandbox (default: true)
 *
 * Docs: https://developer.revolut.com/docs/merchant/create-an-order
 */

const SANDBOX_BASE = 'https://sandbox-merchant.revolut.com/api';
const PRODUCTION_BASE = 'https://merchant.revolut.com/api';

function getBaseUrl(): string {
  const isSandbox = (process.env.REVOLUT_SANDBOX ?? 'true') === 'true';
  return isSandbox ? SANDBOX_BASE : PRODUCTION_BASE;
}

function getApiKey(): string {
  const key = process.env.REVOLUT_API_KEY;
  if (!key) {
    throw new Error('REVOLUT_API_KEY environment variable is not set');
  }
  return key;
}

async function revolutRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      'Revolut-Api-Version': '2024-09-01',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Revolut API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

// ─── Types mirroring Revolut API responses ────────────────────────────────────

export interface RevolutOrder {
  id: string;
  type: string;
  state: 'pending' | 'processing' | 'authorised' | 'completed' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
  amount: number;
  currency: string;
  checkout_url?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateOrderParams {
  /** Amount in minor currency units (cents) */
  amount: number;
  currency: string;
  description?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

export interface RevolutWebhookPayload {
  event: string;
  order_id: string;
  merchant_order_ext_ref?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new Revolut payment order.
 * Returns the order object including the hosted checkout URL.
 */
export async function createOrder(params: CreateOrderParams): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Retrieve an existing order by its Revolut order ID.
 */
export async function getOrder(orderId: string): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>(`/orders/${orderId}`);
}

/**
 * Cancel an existing order (only if pending/processing).
 */
export async function cancelOrder(orderId: string): Promise<RevolutOrder> {
  return revolutRequest<RevolutOrder>(`/orders/${orderId}/cancel`, {
    method: 'POST',
  });
}

/**
 * Check if the Revolut integration is configured
 * (i.e. the API key is set).
 */
export function isConfigured(): boolean {
  return !!process.env.REVOLUT_API_KEY;
}
