import { Telegraf } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Инициализация токена напрямую для надежности [loki-mode]
const token = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

if (!token) {
  console.error('SERVER ERROR: TELEGRAM_BOT_TOKEN IS MISSING');
}

const bot = new Telegraf(token || '');

// Минимальная логика для старта [ai-studio-image]
bot.start((ctx) => {
  return ctx.replyWithHTML(
    '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
    '📸 <b>לחצי על הכפתור למטה כדי להתחיל:</b>',
    {
      reply_markup: {
        keyboard: [
          [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${Date.now()}` } }],
          [{ text: '📝 הגדרות' }]
        ],
        resize_keyboard: true
      }
    }
  );
});

// Роут для вебхука
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(200).send('Bot is ready and waiting for POST from Telegram.');
  }

  try {
    if (!token) throw new Error('Bot token is missing in environment variables');
    
    // Ручная обработка обновления [loki-mode]
    await bot.handleUpdate(req.body);
    return res.status(200).send('OK');
  } catch (err: any) {
    console.error('CRITICAL BOT ERROR:', err);
    // Отправляем детали ошибки для диагностики на стороне Vercel
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      details: err.message,
      token_exists: !!token 
    });
  }
}
