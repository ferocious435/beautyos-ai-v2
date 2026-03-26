import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { bookingId, type } = req.body;
  if (!bookingId) return res.status(400).send('Missing bookingId');

  const supabase = getSupabase();

  // 1. Получаем данные записи и пользователей
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      master:master_id (telegram_id, business_name, full_name),
      client:client_id (telegram_id, first_name)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    console.error('Error fetching booking for reminder:', error);
    return res.status(404).send('Booking not found');
  }

  // 2. Формируем сообщение
  const timeStr = new Date(booking.start_time).toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  });

  const msgPrefix = type === '24h' ? '📢 Напоминание: Завтра' : '⏰ Напоминание: Через 3 часа';
  
  const clientMsg = `${msgPrefix} у вас запись в ${booking.master.business_name || booking.master.full_name}!\n🕓 Время: ${timeStr}\nМы вас ждем! ✨`;
  const masterMsg = `${msgPrefix} к вам придет ${booking.client.first_name || 'клиент'}.\n🕓 Время: ${timeStr}\nПодготовьте рабочее место! 💇‍♀️`;

  try {
    // 3. Отправляем в Telegram
    await Promise.all([
      bot.telegram.sendMessage(booking.client_id, clientMsg),
      bot.telegram.sendMessage(booking.master_id, masterMsg)
    ]);

    // 4. Обновляем флаги в БД (необязательно при QStash, но полезно для аудита)
    const updateField = type === '24h' ? { notified_24h: true } : { notified_3h: true };
    await supabase.from('bookings').update(updateField).eq('id', bookingId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending reminder messages:', err);
    return res.status(500).send('Error sending messages');
  }
}
