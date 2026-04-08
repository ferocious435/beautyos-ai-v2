import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { scheduleNotification } from './_lib/qstash.js';
import { Telegraf } from 'telegraf';
import { validateTelegramWebAppData, getUserFromInitData } from './_lib/telegram-auth.js';

/**
 * Unified services endpoint — combines analytics, payments, webhooks.
 * Route by query param ?action=<action_name>
 * 
 * Actions: reminder, create-booking, approve-booking, reject-booking, cancel-booking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;
  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase connection failed');

  // --- Security Middleware (Telegram Auth) ---
  // Определяем, какие action требуют валидации TG Hash.
  const secureActions = ['create-booking', 'update-booking', 'approve-booking', 'reject-booking', 'cancel-booking'];
  
  let authUser: unknown = null;

  if (secureActions.includes(action)) {
    const initData = req.headers['x-telegram-init-data'] as string;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    const isDev = process.env.NODE_ENV === 'development';
    const isValid = isDev || validateTelegramWebAppData(initData, botToken);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Telegram Signature (API Security Block)' });
    }
    
    authUser = getUserFromInitData(initData);
    if (!authUser?.id) {
      return res.status(401).json({ error: 'Unauthorized: User data missing' });
    }
  }

  switch (action) {



    // --- Reminder Webhook ---
    case 'reminder': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      
      const { verifyQStashSignature } = await import('./_lib/security.js');
      const isQAuthorized = await verifyQStashSignature(req);
      if (!isQAuthorized) {
        return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature (Security Block)' });
      }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        return res.status(500).send('Error sending messages');
      }
    }

    // --- [DIAGNOSTIC MODE v37] ---
    case 'diagnostic': {
      const results: unknown = { timestamp: new Date().toISOString(), tests: {} };
      try {
        const { analyzeAndGenerate } = await import('./_lib/content-engine.js');
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        await analyzeAndGenerate(testBuffer, 'diagnostic-test');
        results.tests.gemini_api = { status: 'PASSED' };
      } catch (e: unknown) {
        results.tests.gemini_api = { status: 'FAILED', error: e.message };
      }
      return res.status(200).json(results);
    }

    case 'create-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { masterTelegramId, clientTelegramId, serviceId, startTime, endTime } = req.body;
      const mId = Number(masterTelegramId);
      const cId = Number(clientTelegramId);
      if (!mId || !cId) return res.status(400).send('Missing valid IDs');

      // Security Check: You can only book for yourself (or you are admin, but let's stick to strict validation)
      if (authUser && Number(authUser.id) !== cId && process.env.NODE_ENV !== 'development') {
          return res.status(403).json({ error: 'Forbidden: Cannot create booking for another user' });
      }

      try {
        const { data: mUser } = await supabase.from('users').select('id, business_name, full_name, telegram_id').eq('telegram_id', mId).single();
        const { data: cUser } = await supabase.from('users').select('id, full_name, telegram_id').eq('telegram_id', cId).single();
        
        if (!mUser || !cUser) return res.status(404).json({ error: 'Master or Client not found in DB' });

        // Если передана услуга, получаем её цену и длительность
        let duration = 60;
        let price = 0;
        if (serviceId) {
          const { data: svc } = await supabase.from('services').select('price, duration_mins').eq('id', serviceId).single();
          if (svc) {
            price = Number(svc.price);
            duration = Number(svc.duration_mins);
          }
        }

        const calculatedEndTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .insert({
            master_id: mUser.id,
            client_id: cUser.id,
            service_id: serviceId || null,
            total_price: price || null,
            start_time: startTime,
            end_time: endTime || calculatedEndTime,
            status: 'pending'
          })
          .select()
          .single();

        if (bErr) throw bErr;

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(startTime).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const masterMsg = `🔔 **בקשת תור חדשה!**\n👤 לקוח: ${cUser.full_name}\n🕓 שעה: ${timeStr}\n\nהיכנסי ל-Studio כדי לאשר או לדחות את התור. ✨`;
        const clientMsg = `⏳ **בקשתך נשלחה!**\n📍 עסק: ${mUser.business_name || mUser.full_name}\n🕓 שעה: ${timeStr}\n\nאנחנו מחכים לאישור המאסטר. נעדכן אותך מיד כשיתקבל אישור! 🙏`;

        await Promise.all([
          bot.telegram.sendMessage(masterTelegramId, masterMsg, { parse_mode: 'Markdown' }),
          bot.telegram.sendMessage(clientTelegramId, clientMsg, { parse_mode: 'Markdown' })
        ]);

        return res.status(200).json({ success: true, bookingId: booking.id });
      } catch (err: unknown) {
        console.error('BOOKING ERROR:', err);
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Approve Booking ---
    case 'approve-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      try {
        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const clientMsg = `✅ **יש! התור שלך אושר!**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה: ${timeStr}\n\nנתראה בקרוב! ✨`;
        await bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' });

        // Schedule QStash Reminders
        const now = new Date().getTime();
        const start = new Date(booking.start_time).getTime();
        
        const delay24h = (start - (24 * 60 * 60 * 1000) - now) / 1000;
        if (delay24h > 0) await scheduleNotification(Math.floor(delay24h), '24h', booking.id);

        const delay3h = (start - (3 * 60 * 60 * 1000) - now) / 1000;
        if (delay3h > 0) await scheduleNotification(Math.floor(delay3h), '3h', booking.id);

        return res.status(200).json({ success: true });
      } catch (err: unknown) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Reject Booking ---
    case 'reject-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId } = req.body;
      if (!bookingId) return res.status(400).send('Missing bookingId');

      try {
        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status: 'rejected' })
          .eq('id', bookingId)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const clientMsg = `😔 **מצטערים, התור לא אושר...**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה: ${timeStr}\n\nהמאסטר לא פנוי במועד זה. נשמח אם תבחרי מועד אחר ביומן! ✨`;
        await bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' });

        return res.status(200).json({ success: true });
      } catch (err: unknown) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Cancel Booking ---
    case 'cancel-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, userId, role } = req.body;
      if (!bookingId || !userId) return res.status(400).send('Missing bookingId or userId');

      // Security Review: we trust the verified caller ID matches the initiator
      // We will enhance checking later via DB RLS or strict back-checks.

      try {
        const status = role === 'master' ? 'cancelled_by_master' : 'cancelled_by_client';
        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', bookingId)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr || !booking) return res.status(404).send('Booking not found');

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(booking.start_time).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        if (role === 'master') {
          // Notify Client
          const msg = `😔 **מצטערים, חל שינוי בלוח הזמנים...**\n\nהתור שלך ב-${booking.master.business_name || booking.master.full_name} ב-**${timeStr}** בוטל על ידי המאסטר.\n\nנשמח אם תקבעי תור למועד חדש! ✨`;
          await bot.telegram.sendMessage(booking.client.telegram_id, msg, { parse_mode: 'Markdown' });
        } else {
          // Notify Master
          const msg = `📢 **עדכון: ביטול תור**\n\nהלקוח/ה ${booking.client.full_name} ביטל/ה את התור שנקבע ל-**${timeStr}**.\n\nהמועד הזה התפנה כעת ביומן שלך. 💇‍♀️`;
          await bot.telegram.sendMessage(booking.master.telegram_id, msg, { parse_mode: 'Markdown' });
        }

        return res.status(200).json({ success: true });
      } catch (err: unknown) {
        return res.status(500).json({ error: err.message });
      }
    }

    // --- Update/Move Booking ---
    case 'update-booking': {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
      const { bookingId, startTime } = req.body;
      if (!bookingId || !startTime) return res.status(400).send('Missing bookingId or startTime');

      try {
        const { data: oldBooking } = await supabase.from('bookings').select('*, service:service_id(duration_mins)').eq('id', bookingId).single();
        if (!oldBooking) return res.status(404).send('Booking not found');

        const duration = oldBooking.service?.duration_mins || 60;
        const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

        const { data: booking, error: bErr } = await supabase
          .from('bookings')
          .update({ start_time: startTime, end_time: endTime, status: 'pending' })
          .eq('id', bookingId)
          .select('*, master:master_id (telegram_id, business_name, full_name), client:client_id (telegram_id, full_name)')
          .single();

        if (bErr) throw bErr;

        const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
        const timeStr = new Date(startTime).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        
        const masterMsg = `🔄 **התור הוזז!**\n👤 לקוח: ${booking.client.full_name}\n🕓 שעה חדשה: ${timeStr}\n\nהשינוי עודכן ביומן. ✨`;
        const clientMsg = `🔄 **עדכון: התור שלך הוזז**\n📍 עסק: ${booking.master.business_name || booking.master.full_name}\n🕓 שעה חדשה: ${timeStr}\n\nהשינוי מחכה לאישור סופי או מעודכן במערכת. 🙏`;

        await Promise.all([
          bot.telegram.sendMessage(booking.master.telegram_id, masterMsg, { parse_mode: 'Markdown' }),
          bot.telegram.sendMessage(booking.client.telegram_id, clientMsg, { parse_mode: 'Markdown' })
        ]);

        return res.status(200).json({ success: true });
      } catch (err: unknown) {
        return res.status(500).json({ error: err.message });
      }
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${action}` });
  }
}
