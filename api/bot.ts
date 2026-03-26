import { Telegraf, session } from 'telegraf';
import { config } from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { BotContext, supabaseSessionMiddleware, setupBotHandlers } from './lib/bot-logic';

config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  if (!token) {
    return res.status(200).json({ 
      status: 'error', 
      message: 'TELEGRAM_BOT_TOKEN is missing. Please set it in Vercel Environment Variables.' 
    });
  }

  try {
    const bot = new Telegraf<BotContext>(token);
    
    // Setup Middleware & Handlers inside the handler scope to catch errors
    bot.use(session());
    bot.use(supabaseSessionMiddleware);
    setupBotHandlers(bot);

    bot.start((ctx) => {
      return ctx.replyWithHTML(
        '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
        'העוזר החכם שלך בשניות.\n\n' +
        '📸 <b>טיפ:</b> שלחו לי תמונה!',
        {
          reply_markup: {
            keyboard: [
              [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${Date.now()}` } }]
            ],
            resize_keyboard: true
          }
        }
      );
    });

    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } else {
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      return res.status(200).send('BeautyOS AI Bot Webhook is ACTIVE and re-set!');
    }
  } catch (err: any) {
    console.error('BOT ERROR:', err);
    return res.status(200).json({ status: 'error', message: err.message });
  }
}
