import { VercelRequest, VercelResponse } from '@vercel/node';
import { createStripeSession } from '../lib/stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { userId, plan } = req.body;
  
  if (!userId || !plan) {
    return res.status(400).json({ error: 'Missing userId or plan' });
  }

  try {
    const successUrl = `${process.env.WEBAPP_URL}/dashboard?payment=success`;
    const cancelUrl = `${process.env.WEBAPP_URL}/pricing?payment=cancel`;
    
    const url = await createStripeSession(userId, plan, successUrl, cancelUrl);
    res.json({ url });
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    res.status(500).json({ error: error.message });
  }
}
