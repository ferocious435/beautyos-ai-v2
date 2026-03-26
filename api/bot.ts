import { v4 as uuidv4 } from 'uuid';
import { Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';

// We import logic but we will call it only inside the handler
import { BotContext, supabaseSessionMiddleware, setupBotHandlers } from './lib/bot-logic';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  console.log('BOT HANDLER: Start');

  if (!token) {
    console.error('BOT ERROR: Missing TELEGRAM_BOT_TOKEN');
    return res.status(200).json({ 
      status: 'error', 
      message: 'TELEGRAM_BOT_TOKEN is missing. Please check Vercel environment variables.' 
    });
  }

  try {
    // Basic telegraf init should be safe here
    const bot = new Telegraf<BotContext>(token);
    
    // Middleware
    bot.use(session());
    bot.use(supabaseSessionMiddleware);
    
    // Handlers
    setupBotHandlers(bot);

    bot.start((ctx) => {
      return ctx.replyWithHTML(
        '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
        'העוזר החכם שלך בשניות.\n\n' +
        '📸 <b>טיפ:</b> שלחו לי תמונה!',
        {
          reply_markup: {
            keyboard: [
              [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${uuidv4()}` } }]
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
      // For GET requests (browser/manual check)
      try {
        await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
        return res.status(200).json({ 
          status: 'success', 
          message: 'Webhook updated',
          bot_token_present: !!token,
          webapp_url: WEBAPP_URL
        });
      } catch (webhookErr: any) {
        return res.status(200).json({ 
          status: 'partially_offline', 
          message: 'Webhook update failed, but bot initialized',
          error: webhookErr.message
        });
      }
    }
  } catch (err: any) {
    console.error('CRITICAL BOT ERROR:', err);
    return res.status(200).json({ 
      status: 'error', 
      message: 'Internal Bot Error',
      details: err.message 
    });
  }
}
