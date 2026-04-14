import { VercelRequest, VercelResponse } from '@vercel/node';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  console.log(`[Bot] Incoming Request: ${req.method}`);
  
  try {
    if (req.method === 'POST') {
      console.log(`[Bot] Update Body:`, JSON.stringify(req.body));
      // Telegram Webhook Handler
      await bot.handleUpdate(req.body);
      console.log(`[Bot] HandleUpdate SUCCESS`);
      res.status(200).send('OK');
    } else {
      // Quick Status Check
      const status = `BeautyOS AI Bot v41: Listening\nToken: ${botToken ? 'OK' : 'MISSING'}\nURL: ${process.env.WEBAPP_URL}`;
      console.log(`[Bot] Status Check (Force Refresh)`);
      res.status(200).send(status);
    }
  } catch (err: any) {
    console.error('!!! BOT_HANDLER_CRITICAL_ERR !!!:', err);
    console.error('Error Stack:', err.stack);
    res.status(500).json({ error: 'Webhook Error', message: err.message });
  }
}
