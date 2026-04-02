import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf, session } from 'telegraf';
import { BotContext, setupBotHandlers, supabaseSessionMiddleware } from './_lib/bot-logic.js';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing');

const bot = new Telegraf<BotContext>(botToken);

// 1. Persistence & Session Middleware (Supabase Stateless)
bot.use(supabaseSessionMiddleware);
// Removed redundant bot.use(session()) to prevent conflicts

// 2. Setup Logic Handlers & Scenes (Defined in bot-logic)
setupBotHandlers(bot);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') {
      // Telegram Webhook Handler
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      // Quick Status Check
      res.status(200).send('BeautyOS AI Bot v39: Listening (Truth Layer Active)');
    }
  } catch (err) {
    console.error('BOT_HANDLER_CRITICAL_ERR:', err);
    res.status(500).send('Webhook Error');
  }
}
