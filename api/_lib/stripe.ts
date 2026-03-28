import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

/**
 * BeautyOS Stripe Configuration
 * Реестр ID цен для уровней подписки. 
 * В продакшене замените на реальные IDs из Stripe Dashboard.
 */
export const SUBSCRIPTION_PLANS = {
  ESSENTIAL: {
    id: process.env.STRIPE_PRICE_ID_ESSENTIAL || 'price_placeholder_essential',
    name: 'Essential',
    features: ['AI Beauty Studio', 'Basic Portfolio']
  },
  PRO: {
    id: process.env.STRIPE_PRICE_ID_PRO || 'price_placeholder_pro',
    name: 'Pro',
    features: ['Advanced AI', 'Infinite Portfolio', 'Booking System']
  },
  ELITE: {
    id: process.env.STRIPE_PRICE_ID_ELITE || 'price_placeholder_elite',
    name: 'Elite',
    features: ['White-label Bot', 'Custom Trends', 'Priority Support']
  }
};

export async function createStripeSession(userId: string, plan: string, successUrl: string, cancelUrl: string) {
  const planConfig = (SUBSCRIPTION_PLANS as any)[plan.toUpperCase()];
  if (!planConfig) throw new Error(`Invalid plan: ${plan}`);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: planConfig.id, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: {
      plan: plan,
      telegram_id: userId,
      version: 'v3.2-stabilized'
    }
  });

  return session.url;
}
