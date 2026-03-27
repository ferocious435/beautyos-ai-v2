import { Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';

// We import logic safely
import { BotContext, supabaseSessionMiddleware, setupBotHandlers } from './lib/bot-logic';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  if (!token) {
    return res.status(200).json({ 
      status: 'error', 
      message: 'TELEGRAM_BOT_TOKEN is missing on server. Please set it in Vercel environment variables.' 
    });
  }

  try {
    const bot = new Telegraf<BotContext>(token);
    
    // Middleware
    bot.use(session());
    bot.use(supabaseSessionMiddleware);
    
    // Handlers
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
      // GET is for diagnostic/webhook setup
      try {
        await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
        return res.status(200).json({ 
          status: 'success', 
          message: 'BeautyOS AI Bot Webhook is ACTIVE!',
          token_present: true,
          webapp_url: WEBAPP_URL
        });
      } catch (webhookErr: any) {
        return res.status(200).json({ 
          status: 'success', 
          message: 'Bot logic initialized, but webhook update failed (check manual setup).',
          error: webhookErr.message
        });
      }
    }
  } catch (err: any) {
    console.error('BOT RELIABILITY ERROR:', err);
    return res.status(200).json({ 
      status: 'recovery_mode', 
      error: err.message,
      note: 'Bot logic failed to initialize. Check for top-level errors in bot-logic.ts' 
    });
  }
}
