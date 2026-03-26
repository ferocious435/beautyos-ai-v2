import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase';
import { Telegraf } from 'telegraf';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const bot = new Telegraf(process.env.BOT_TOKEN!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || JSON.stringify(req.body),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase connection failed');

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const telegramId = session.metadata?.telegram_id;
    const plan = session.metadata?.plan;

    if (telegramId && plan) {
      // 1. Update User Tier
      await supabase
        .from('users')
        .update({ subscription_tier: plan })
        .eq('telegram_id', telegramId);

      // 2. Log Subscription
      await supabase.from('subscriptions').insert([{
        user_id: telegramId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan_id: plan,
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Placeholder
      }]);

      // 3. Notify User in Telegram
      try {
        await bot.telegram.sendMessage(telegramId, 
          `🎉 **מזל טוב! תוכנית ה-${plan.toUpperCase()} שלך הופעלה!**\n\n` +
          `כעת יש לך גישה מלאה לכל הכלים החדשים. בואו נתחיל לעבוד! 🚀`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.error('Failed to notify user:', e);
      }
    }
  }

  res.json({ received: true });
}
