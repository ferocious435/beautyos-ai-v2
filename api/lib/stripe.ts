import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const PRICE_IDS: Record<string, string> = {
  essential: 'price_essential_id', // Заменить на реальные IDs из Stripe Dashboard
  pro: 'price_pro_id',
  elite: 'price_elite_id',
};

export async function createStripeSession(userId: string, plan: string, successUrl: string, cancelUrl: string) {
  const priceId = PRICE_IDS[plan];
  if (!priceId) throw new Error('Invalid plan');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: {
      plan: plan,
      telegram_id: userId
    }
  });

  return session.url;
}
