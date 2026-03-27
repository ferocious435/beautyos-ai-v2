import { Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';

// IMPORT: We use dynamic path for safety, but Telegraf needs to be stable.
// All bot-logic handlers are decoupled to prevent top-level crashes.
import { BotContext, supabaseSessionMiddleware, setupBotHandlers } from './lib/bot-logic';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  console.log('BOT HANDLER: Start (Functional Mode)');

  if (!token) {
    return res.status(200).json({ 
      status: 'offline_mode', 
      message: 'TELEGRAM_BOT_TOKEN is missing. Bot is in diagnostic mode.' 
    });
  }

  try {
    const bot = new Telegraf<BotContext>(token);
    
    // Middleware & Handlers initialization INSIDE the handler to catch module errors
    bot.use(session());
    bot.use(supabaseSessionMiddleware);
    setupBotHandlers(bot);

    bot.start((ctx) => {
      const cacheBust = Date.now();
      return ctx.replyWithHTML(
        '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
        'העוזר החכם שלך בשניות.\n\n' +
        '📸 <b>טיפ:</b> שלחו לי תמונה!',
        {
          reply_markup: {
            keyboard: [
              [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${cacheBust}` } }]
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
      // GET requests setup the webhook and show status
      try {
        await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
        return res.status(200).json({ 
          status: 'success', 
          message: 'BeautyOS AI Bot is ONLINE and Webhook set!',
          timestamp: new Date().toISOString(),
          webapp_url: WEBAPP_URL
        });
      } catch (webhookErr: any) {
        return res.status(200).json({ 
          status: 'partially_ready', 
          message: 'Bot logic is ready, but webhook set failed.',
          error: webhookErr.message
        });
      }
    }
  } catch (err: any) {
    console.error('SERVERLESS INVOKE ERROR:', err);
    return res.status(200).json({ 
      status: 'fault', 
      message: 'Bot failed to initialize handlers.',
      details: err.message
    });
  }
}
