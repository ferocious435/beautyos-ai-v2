import { Telegraf, session, Scenes } from 'telegraf';
import { config } from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';

config();

// Константы и типы
interface BotContext extends Scenes.SceneContext {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');

// Создание бота
const bot = new Telegraf<BotContext>(token);

// Сцены (упрощено для стабильности на Vercel)
const stage = new Scenes.Stage<BotContext>([]);
bot.use(session());
bot.use(stage.middleware());

// Главная команда
bot.start((ctx) => {
  return ctx.replyWithHTML(
    '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
    'העוזר החכם שלך ליצירת תוכן בשניות.\n\n' +
    '📸 <b>פשוט לחצי על הכפתור למטה כדי להתחיל:</b>',
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

// Обработчик вебхука для Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('Error handling bot update:', err);
      res.status(500).send('Error');
    }
  } else {
    // При GET запросе проверяем/устанавливаем вебхук [loki-mode]
    try {
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      res.status(200).send('BeautyOS AI Bot Webhook is ACTIVE and re-set!');
    } catch (e) {
      res.status(500).send('Failed to set webhook');
    }
  }
}
