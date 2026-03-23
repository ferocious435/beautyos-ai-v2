import { Telegraf, session, Scenes } from 'telegraf';
import { config } from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';

config();

interface BotContext extends Scenes.SceneContext {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');

const bot = new Telegraf<BotContext>(token);

bot.use(session());
const stage = new Scenes.Stage<BotContext>([]);
bot.use(stage.middleware());

bot.start((ctx) => {
  return ctx.replyWithHTML(
    '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
    'העוזר החכם שלך ליצירת תוכן בשניות.\n\n' +
    '📸 <b>מה תמצאו כאן?</b>\n' +
    '🤖 <b>סטודיו AI</b> — יצירת פוסטים וניתוח תמונות חכם.\n' +
    '📝 <b>הרשמה</b> — הגדרת הפרופיל האישי שלך.\n' +
    '🖼️ <b>תיק עבודות</b> — ניהול וצפייה בעבודות שלך.\n' +
    '⚙️ <b>הגדרות</b> — ניהול חשבон ויומן.\n\n' +
    '📸 <b>טיפ:</b> פשוט שלחו לי תמונה של עבודה, ואני כבר אדаג לשפר אותה ולכתוב עבורכם פוסט!',
    {
      reply_markup: {
        keyboard: [
          [{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${Date.now()}` } }, { text: '📝 הרשמה' }],
          [{ text: '🖼️ תיק עבודות' }, { text: '⚙️ הגדרות' }]
        ],
        resize_keyboard: true
      }
    }
  );
});

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
    try {
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      res.status(200).send('BeautyOS AI Bot Webhook is ACTIVE and re-set!');
    } catch (e) {
      res.status(500).send('Failed to set webhook');
    }
  }
}
