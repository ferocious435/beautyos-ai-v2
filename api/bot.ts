import { Telegraf, session, Markup } from 'telegraf';
import { config } from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { BotContext, supabaseSessionMiddleware, setupBotHandlers } from './lib/bot-logic';

config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

let bot: Telegraf<BotContext>;

try {
  if (!token) {

    console.warn('TELEGRAM_BOT_TOKEN is missing - bot is INACTIVE');
    // We create a dummy bot or just skip initialization to prevent 500 error
    bot = new Telegraf<BotContext>('DUMMY_TOKEN_PREVENT_500');
  } else {
    bot = new Telegraf<BotContext>(token);
  }
} catch (e) {
  console.error('CRITICAL: Bot initialization failed:', e);
  bot = new Telegraf<BotContext>('DUMMY_TOKEN_PREVENT_500');
}


// 1. Session & Middleware
bot.use(session()); // Local session fallback
bot.use(supabaseSessionMiddleware); // Ultra persistence (stateless)

// 2. Setup Scenes and Handlers
setupBotHandlers(bot);

bot.start((ctx) => {
  return ctx.replyWithHTML(
    '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
    'העוזר החכם שלך ליצירת תוכן בשניות ובניהול הסטודיו.\n\n' +
    '📸 <b>מה תמצאו כאן?</b>\n' +
    '🤖 <b>סטודיו AI</b> — פוסטים וניתוח חכם.\n' +
    '📝 <b>הרשמה</b> — הגדרת הפרופיל האישי שלך.\n' +
    '🛡️ <b>ניהול</b> — הגדרת תפקיד ובדיקות.\n\n' +
    '📸 <b>טיפ:</b> שלחו לי תמונה של עבודה, ואני כבר אדאג לשפר אותה ולכתוב עבורכם פוסט!',
    {
      reply_markup: {
        keyboard: [
          [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${Date.now()}` } }, { text: '📝 הרשמה' }],
          [{ text: '🛡️ ניהול תפקיד' }, { text: '⚙️ הגדרות' }]
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.hears('🛡️ ניהול תפקיד', (ctx) => {
  return ctx.reply('בחר תפקיד לטסט:', 
    Markup.inlineKeyboard([
      [Markup.button.callback('💆‍♂️ Master', 'set_fast_role_master')],
      [Markup.button.callback('🛍️ Client', 'set_fast_role_client')],
      [Markup.button.callback('👑 Admin', 'set_fast_role_admin')]
    ])
  );
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!token) {
    return res.status(200).json({ 
      status: 'error', 
      message: 'TELEGRAM_BOT_TOKEN is missing on server. Check Vercel environment variables.' 
    });
  }

  if (req.method === 'POST') {

    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('Error handling bot update:', err);
      res.status(500).send('Error');
    }
  } else {
    try {
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      res.status(200).send('BeautyOS AI Bot Webhook is ACTIVE and re-set!');
    } catch (e) {
      res.status(500).send('Failed to set webhook');
    }
  }
}
