import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import type Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

const readRawBody = async (req: VercelRequest): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const getPlanFromEvent = (metadata?: Record<string, string> | null) => {
  const plan = metadata?.plan;
  return plan === 'essential' || plan === 'pro' || plan === 'elite' ? plan : null;
};

const getTelegramIdFromEvent = (metadata?: Record<string, string> | null, fallback?: string | null) => {
  const raw = metadata?.telegram_id || fallback || '';
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !stripeSecret) {
    return res.status(500).json({ error: 'Stripe webhook is not configured' });
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(stripeSecret);

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook signature';
    return res.status(400).json({ error: message });
  }

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Supabase missing' });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const plan = getPlanFromEvent(session.metadata);
    const telegramId = getTelegramIdFromEvent(session.metadata, session.client_reference_id);

    if (plan && telegramId) {
      const { error } = await supabase
        .from('users')
        .update({ subscription_tier: plan })
        .eq('telegram_id', telegramId);
      if (error) return res.status(500).json({ error: 'Failed to update subscription' });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const telegramId = getTelegramIdFromEvent(subscription.metadata);

    if (telegramId) {
      const { error } = await supabase
        .from('users')
        .update({ subscription_tier: 'free' })
        .eq('telegram_id', telegramId);
      if (error) return res.status(500).json({ error: 'Failed to update subscription' });
    }
  }

  return res.status(200).json({ received: true });
}
