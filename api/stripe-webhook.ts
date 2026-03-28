import { VercelRequest, VercelResponse } from '@vercel/node';
import { stripe } from './_lib/stripe.js';
import { getSupabase } from './_lib/supabase.js';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = getSupabase();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const telegramId = session.metadata?.telegram_id;
    const plan = session.metadata?.plan;

    if (telegramId && supabase) {
      console.log(`WEBHOOK: Success for user ${telegramId}, plan ${plan}`);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          subscription_tier: plan,
          last_seen: new Date().toISOString() 
        })
        .eq('telegram_id', telegramId);

      if (error) console.error('WEBHOOK: DB Error:', error);
    }
  }

  res.status(200).json({ received: true });
}
