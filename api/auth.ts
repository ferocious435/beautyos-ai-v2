import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import crypto from 'crypto';

/**
 * BeautyOS AI Security Gate
 * Проверяет подлинность данных от Telegram и возвращает профиль пользователя.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { initData } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return res.status(401).json({ error: 'Missing initData or botToken' });
  }

  // 1. Валидация подписи Telegram (Security Standard)
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  urlParams.sort();

  let dataCheckString = '';
  for (const [key, value] of urlParams.entries()) {
    dataCheckString += `${key}=${value}\n`;
  }
  dataCheckString = dataCheckString.slice(0, -1);

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const isAlpha = process.env.NODE_ENV === 'development'; // Разрешаем без проверки в деве

  if (calculatedHash !== hash && !isAlpha) {
    return res.status(403).json({ error: 'Invalid hash' });
  }

  // 2. Получение данных из БД
  const user = JSON.parse(urlParams.get('user') || '{}');
  const tgId = Number(user.id);

  if (!tgId) return res.status(400).json({ error: 'User ID not found' });

  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: 'Database offline' });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'User not registered. Start bot first.' });
  }

  // 3. Возвращаем профиль Люкс-стандарта
  return res.status(200).json({
    id: data.id,
    telegram_id: data.telegram_id,
    name: data.full_name,
    role: data.role,
    subscription: data.subscription_tier,
    business_name: data.business_name,
    address: data.address
  });
}
