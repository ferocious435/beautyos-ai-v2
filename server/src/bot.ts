import { Telegraf, session, Scenes } from 'telegraf';
import { BotContext } from './context.js';
import { setupPhotoHandler } from './handlers/photoHandler.js';
import { registrationScene } from './scenes/registration.js';
import { contentScene } from './scenes/content.js';

export function createBot(token: string) {
  const bot = new Telegraf<BotContext>(token);

  const stage = new Scenes.Stage<BotContext>([
    registrationScene,
    contentScene
  ]);

  bot.use(session());
  bot.use(stage.middleware());

  bot.start((ctx) => {
    ctx.replyWithHTML(
      '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
      'העוזר החכם שלך ליצירת תוכן בשניות.\n\n' +
      '<b>מה תמצאו כאן?</b>\n' +
      '🤖 <b>סטודיו AI</b> — יצירת פוסטים וניתוח תמונות חכם.\n' +
      '📝 <b>הרשמה</b> — הגדרת הפרופיל האישי שלך.\n' +
      '🖼️ <b>תיק עבודות</b> — ניהול וצפייה בעבודות שלך.\n' +
      '⚙️ <b>הגדרות</b> — ניהול חשבון ויומן.\n\n' +
      '📸 <b>טיפ:</b> פשוט שלחו לי תמונה של עבודה, ואני כבר אדאג לשפר אותה ולכתוב עבורכם פוסט!',
      {
        reply_markup: {
          keyboard: [
            [{ text: '🤖 סטודיו AI' }, { text: '📝 הרשמה' }],
            [{ text: '🖼️ תיק עבודות' }, { text: '⚙️ הגדרות' }]
          ],
          resize_keyboard: true
        }
      }
    );
  });

  bot.hears('🤖 סטודיו AI', (ctx) => ctx.scene.enter('CONTENT_SCENE'));
  bot.hears('📝 הרשמה', (ctx) => ctx.scene.enter('REGISTRATION_SCENE'));

  setupPhotoHandler(bot);

  return bot;
}
