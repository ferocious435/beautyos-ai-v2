import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { createStripeSession } from './_lib/stripe.js';
import { scheduleNotification } from './_lib/qstash.js';
import { runWeeklyAnalysis } from './_lib/trend-analyzer.js';
import { Telegraf } from 'telegraf';

/**
 * Unified services endpoint — combines analytics, payments, webhooks.
 * Route by query param ?action=<action_name>
 * 
 * Actions: track, create-payment, stripe-webhook, reminder, create-booking, cron-trends
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;
  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase connection failed');

  switch (action) {
    // --- Analytics Track ---
    case 'track': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { eventType, masterId, clientId, district } = req.body;
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

    // --- Stripe Webhook (Automated Upgrade) ---
    case 'stripe-webhook': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const sig = req.headers['stripe-signature'] as string;
      
      try {
        const { stripe } = await import('./_lib/stripe.js');
        const event = stripe.webhooks.constructEvent(
          (req as any).rawBody || req.body, 
          sig, 
          process.env.STRIPE_WEBHOOK_SECRET!
        );

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as any;
          const userId = session.client_reference_id;
          const plan = session.metadata?.plan || 'essential';
          
          if (userId) {
            await supabase.from('users').update({ subscription_tier: plan }).eq('id', userId);
            const { data: user } = await supabase.from('users').select('telegram_id').eq('id', userId).single();
            
            if (user?.telegram_id) {
              const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
              const message = `🎉 **הופה! השדרוג שלך הושלם!**\n\nחשבון ה-**${plan.toUpperCase()}** שלך הופעל בהצלחה. כל הכלים המתקדמים שלנו מחכים לך עכשיו.\n\nקדימה, בואי נכבוש את השוק! 🚀✨`;
              await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
            }
          }
        }
        return res.status(200).json({ received: true });
      } catch (err: any) {
        console.error('WEBHOOK ERROR:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // --- Cron: Weekly Trends ---
    case 'cron-trends': {
      const authHeader = req.headers['authorization'];
      const cronSecret = process.env.CRON_SECRET;
      
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      console.log('CRON: Starting weekly trend analysis...');
      const trends = await runWeeklyAnalysis();
      return res.status(200).json({ status: 'success', trends });
    }

    // --- Reminder Webhook ---
    case 'reminder': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, type } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
        .eq('id', bookingId).single();
      
      if (error || !booking) return res.status(404).send('Booking not found');
      
      const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      const pre = type === '24h' ? '📢 תזכורת: מחר' : '⏰ תזכורת: בעוד 3 שעות';
      
      const clientMsg = `${pre} יש לך תור ב-${booking.master.business_name || booking.master.full_name}!\n🕓 שעה: ${timeStr}\nמחכים לך! ✨`;
      const masterMsg = `${pre} מגיע/ה אליך ${booking.client.full_name || 'לקוח/ה'}.\n🕓 שעה: ${timeStr}\nהכן/י את מקום העבודה! 💇‍♀️`;
      
      try {
        await Promise.all([
          bot.telegram.sendMessage(booking.master.telegram_id, clientMsg),
          bot.telegram.sendMessage(booking.client.telegram_id, masterMsg)
        ]);
        const updateField = type === '24h' ? { notified_24h: true } : { notified_3h: true };
        await supabase.from('bookings').update(updateField).eq('id', bookingId);
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).send('Error sending messages');
      }
    }

    // --- Create Booking (Full Flow) ---
    case 'create-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { masterTelegramId, clientTelegramId, startTime, endTime } = req.body;
      const mId = Number(masterTelegramId);
      const cId = Number(clientTelegramId);
      if (!mId || !cId) return res.status(400).send('Missing valid IDs');

      try {
        const { data: mUser } = await supabase.from('users').select('id, business_name, full_name, telegram_id').eq('telegram_id', mId).single();
        const { data: cUser } = await supabase.from('users').select('id, full_name, telegram_id').eq('telegram_id', cId).single();
        
        if (!mUser || !cUser) return res.status(404).json({ error: 'Master or Client not found in DB' });

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .insert({
            master_id: mUser.id,
            client_id: cUser.id,
            start_time: startTime,
            end_time: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
            status: 'confirmed'
          })
          .select()
          .single();

        if (bErr) throw bErr;

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(startTime).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const masterMsg = `🎉 **תור חדש נקבע!**\n👤 לקוח: ${cUser.full_name}\n🕓 שעה: ${timeStr}\n\nהכני את מקום העבודה 💇‍♀️`;
        const clientMsg = `✅ **הזמנתך אושרה!**\n📍 עסק: ${mUser.business_name || mUser.full_name}\n🕓 שעה: ${timeStr}\n\nנתראה בקרוב! ✨`;

        await Promise.all([
          bot.telegram.sendMessage(masterTelegramId, masterMsg, { parse_mode: 'Markdown' }),
          bot.telegram.sendMessage(clientTelegramId, clientMsg, { parse_mode: 'Markdown' })
        ]);

        const now = new Date().getTime();
        const start = new Date(startTime).getTime();
        
        const delay24h = (start - (24 * 60 * 60 * 1000) - now) / 1000;
        if (delay24h > 0) await scheduleNotification(Math.floor(delay24h), '24h', booking.id);

        const delay3h = (start - (3 * 60 * 60 * 1000) - now) / 1000;
        if (delay3h > 0) await scheduleNotification(Math.floor(delay3h), '3h', booking.id);

        return res.status(200).json({ success: true, bookingId: booking.id });
      } catch (err: any) {
        console.error('BOOKING ERROR:', err);
        return res.status(500).json({ error: err.message });
      }
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
