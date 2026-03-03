import express, { Response } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../models/prisma';
import * as revolut from '../services/revolut';
import { db } from '../models/database';

const getWebhookSecret = () => process.env.REVOLUT_WEBHOOK_SECRET || '';
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

const router = express.Router();

// ─── Plans ────────────────────────────────────────────────────────────────────

/** GET /api/billing/plans – list all active plans */
router.get('/plans', async (_req, res: Response): Promise<void> => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const formatted = plans.map((p) => ({
      ...p,
      features: JSON.parse(p.features) as string[],
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// ─── Current subscription ─────────────────────────────────────────────────────

/** GET /api/billing/subscription – get current user's subscription */
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId! },
      include: { plan: true },
    });

    if (!subscription) {
      res.json({ subscription: null });
      return;
    }

    res.json({
      subscription: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features) as string[],
        },
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ─── Subscribe / Change plan ──────────────────────────────────────────────────

/** POST /api/billing/subscribe – create or change subscription */
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planId, billingInterval } = req.body;

    if (!planId) {
      res.status(400).json({ error: 'Plan ID is required' });
      return;
    }

    const interval = billingInterval === 'yearly' ? 'yearly' : 'monthly';

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    // Users live in the in-memory store (not yet migrated to Prisma),
    // so look them up there instead of via prisma.user.
    const user = db.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const amount = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly;

    // Free plan – just create the subscription directly
    if (amount === 0) {
      const now = new Date();
      const periodEnd = new Date(now);
      if (interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const subscription = await prisma.subscription.upsert({
        where: { userId: req.userId! },
        update: {
          planId: plan.id,
          status: 'active',
          billingInterval: interval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          revolutOrderId: null,
        },
        create: {
          userId: req.userId!,
          planId: plan.id,
          status: 'active',
          billingInterval: interval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      res.json({
        subscription: {
          ...subscription,
          plan: {
            ...subscription.plan,
            features: JSON.parse(subscription.plan.features) as string[],
          },
        },
      });
      return;
    }

    // Paid plan – create a Revolut order
    if (!revolut.isConfigured()) {
      // If Revolut is not configured, create subscription directly (dev mode)
      const now = new Date();
      const periodEnd = new Date(now);
      if (interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const subscription = await prisma.subscription.upsert({
        where: { userId: req.userId! },
        update: {
          planId: plan.id,
          status: 'active',
          billingInterval: interval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          userId: req.userId!,
          planId: plan.id,
          status: 'active',
          billingInterval: interval,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      res.json({
        subscription: {
          ...subscription,
          plan: {
            ...subscription.plan,
            features: JSON.parse(subscription.plan.features) as string[],
          },
        },
        warning: 'Revolut not configured – subscription activated without payment (dev mode)',
      });
      return;
    }

    // Create Revolut order
    const order = await revolut.createOrder({
      amount,
      currency: plan.currency,
      description: `${plan.displayName} plan (${interval})`,
      customer_email: user.email,
      metadata: {
        userId: req.userId!,
        planId: plan.id,
        billingInterval: interval,
      },
    });

    // Store payment record
    await prisma.payment.create({
      data: {
        userId: req.userId!,
        amount,
        currency: plan.currency,
        status: 'pending',
        revolutOrderId: order.id,
        description: `${plan.displayName} plan (${interval})`,
        metadata: JSON.stringify({ planId: plan.id, billingInterval: interval }),
      },
    });

    res.json({
      checkoutUrl: order.checkout_url,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ─── Cancel subscription ──────────────────────────────────────────────────────

/** POST /api/billing/cancel – cancel subscription at period end */
router.post('/cancel', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId! },
    });

    if (!subscription) {
      res.status(404).json({ error: 'No active subscription' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });

    res.json({
      subscription: {
        ...updated,
        plan: {
          ...updated.plan,
          features: JSON.parse(updated.plan.features) as string[],
        },
      },
      message: 'Subscription will be cancelled at the end of the current billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─── Resume subscription ─────────────────────────────────────────────────────

/** POST /api/billing/resume – undo pending cancellation */
router.post('/resume', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId! },
    });

    if (!subscription || !subscription.cancelAtPeriodEnd) {
      res.status(400).json({ error: 'No pending cancellation to resume' });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { cancelAtPeriodEnd: false },
      include: { plan: true },
    });

    res.json({
      subscription: {
        ...updated,
        plan: {
          ...updated.plan,
          features: JSON.parse(updated.plan.features) as string[],
        },
      },
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// ─── Payment history ──────────────────────────────────────────────────────────

/** GET /api/billing/payments – list payment history */
router.get('/payments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ─── Revolut webhook ──────────────────────────────────────────────────────────

/** POST /api/billing/webhook/revolut – handle Revolut webhook events */
router.post('/webhook/revolut', async (req, res: Response): Promise<void> => {
  try {
    // ── Verify Revolut webhook signature ──────────────────────────────
    const webhookSecret = getWebhookSecret();
    if (webhookSecret) {
      const signatureHeader = req.headers['revolut-signature'] as string | undefined;
      if (!signatureHeader) {
        res.status(401).json({ error: 'Missing Revolut-Signature header' });
        return;
      }

      // Revolut signature format: v1=<signature>,t=<timestamp>
      const parts: Record<string, string> = {};
      for (const part of signatureHeader.split(',')) {
        const [key, ...rest] = part.split('=');
        parts[key.trim()] = rest.join('=').trim();
      }

      const signature = parts['v1'];
      const timestamp = parts['t'];

      if (!signature || !timestamp) {
        res.status(401).json({ error: 'Invalid Revolut-Signature format' });
        return;
      }

      // Check timestamp to prevent replay attacks
      const timestampMs = parseInt(timestamp, 10) * 1000;
      if (Math.abs(Date.now() - timestampMs) > WEBHOOK_TIMESTAMP_TOLERANCE_MS) {
        res.status(401).json({ error: 'Webhook timestamp too old' });
        return;
      }

      // Verify HMAC-SHA256 signature
      const payload = `${timestamp}.${JSON.stringify(req.body)}`;
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    const { event, order_id } = req.body as revolut.RevolutWebhookPayload;

    if (!order_id) {
      res.status(400).json({ error: 'Missing order_id' });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { revolutOrderId: order_id },
    });

    if (!payment) {
      // Not our payment – acknowledge anyway
      res.json({ received: true });
      return;
    }

    if (event === 'ORDER_COMPLETED' || event === 'ORDER_AUTHORISED') {
      // Mark payment as completed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' },
      });

      // Parse metadata to get plan info
      const meta = JSON.parse(payment.metadata ?? '{}');
      const planId = meta.planId as string | undefined;
      const billingInterval = (meta.billingInterval as string) ?? 'monthly';

      if (planId) {
        const now = new Date();
        const periodEnd = new Date(now);
        if (billingInterval === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await prisma.subscription.upsert({
          where: { userId: payment.userId },
          update: {
            planId,
            status: 'active',
            billingInterval,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            revolutOrderId: order_id,
          },
          create: {
            userId: payment.userId,
            planId,
            status: 'active',
            billingInterval,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            revolutOrderId: order_id,
          },
        });
      }
    } else if (event === 'ORDER_PAYMENT_FAILED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── Revolut config status (for frontend) ─────────────────────────────────────

/** GET /api/billing/config – check if Revolut is configured */
router.get('/config', (_req, res: Response): void => {
  res.json({
    revolutConfigured: revolut.isConfigured(),
  });
});

export default router;
