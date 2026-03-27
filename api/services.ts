import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { createStripeSession } from './_lib/stripe.js';
import { Telegraf } from 'telegraf';

/**
 * Unified services endpoint — combines analytics, payments, webhooks.
 * Route by query param ?action=<action_name>
 * 
 * Actions: track, create-payment, stripe-webhook, reminder
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  switch (action) {
    // --- Analytics Track ---
    case 'track': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { eventType, masterId, clientId, district } = req.body;
      const supabase = getSupabase();
      if (!supabase) return res.status(500).send('Supabase connection failed');
      const { error } = await supabase.from('analytics_events').insert([{
        event_type: eventType, master_id: masterId, client_id: clientId, district
      }]);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    // --- Create Payment Session ---
    case 'create-payment': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { userId, plan } = req.body;
      if (!userId || !plan) return res.status(400).json({ error: 'Missing userId or plan' });
      try {
        const successUrl = `${process.env.WEBAPP_URL}/dashboard?payment=success`;
        const cancelUrl = `${process.env.WEBAPP_URL}/pricing?payment=cancel`;
        const url = await createStripeSession(userId, plan, successUrl, cancelUrl);
        return res.json({ url });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }

    // --- Reminder Webhook ---
    case 'reminder': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, type } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');
      const supabase = getSupabase();
      if (!supabase) return res.status(500).send('DB error');
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, first_name)')
        .eq('id', bookingId).single();
      if (error || !booking) return res.status(404).send('Booking not found');
      const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const pre = type === '24h' ? '📢 תזכורת: מחר' : '⏰ תזכורת: בעוד 3 שעות';
      const clientMsg = `${pre} יש לך תור ב-${booking.master.business_name || booking.master.full_name}!\n🕓 שעה: ${timeStr}\nמחכים לך! ✨`;
      const masterMsg = `${pre} מגיע/ה אליך ${booking.client.first_name || 'לקוח/ה'}.\n🕓 שעה: ${timeStr}\nהכן/י את מקום העבודה! 💇‍♀️`;
      try {
        await Promise.all([
          bot.telegram.sendMessage(booking.client_id, clientMsg),
          bot.telegram.sendMessage(booking.master_id, masterMsg)
        ]);
        const updateField = type === '24h' ? { notified_24h: true } : { notified_3h: true };
        await supabase.from('bookings').update(updateField).eq('id', bookingId);
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).send('Error sending messages');
      }
    }

    default:
      return res.status(400).json({ error: 'Unknown action. Use ?action=track|create-payment|reminder' });
  }
}
