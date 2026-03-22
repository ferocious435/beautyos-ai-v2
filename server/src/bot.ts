import { Telegraf, session, Scenes } from 'telegraf';
import { BotContext } from './context.js';
import { setupPhotoHandler } from './handlers/photoHandler.js';
import { registrationScene, REGISTRATION_SCENE } from './scenes/registration.js';
import { contentScene, CONTENT_SCENE } from './scenes/content.js';
import { supabase } from './services/supabase.js';
import { trendAnalyzer } from './services/trendAnalyzer.js';

export function createBot(token: string) {
  const bot = new Telegraf<BotContext>(token);

  const stage = new Scenes.Stage<BotContext>([
    registrationScene,
    contentScene
  ]);

  bot.use(session());
  bot.use(stage.middleware());

  const ADMIN_ID = 305032473;

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      console.log(`[USER_LOG] ID: ${ctx.from.id}, Name: ${ctx.from.first_name}, Username: @${ctx.from.username || 'none'}`);
    }
    return next();
  });

  bot.command('admin', (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) {
      return ctx.reply('❌ אין לך הרשאות למצב זה.');
    }
    ctx.reply('🔧 ברוך הבא, מנהל על! (Admin Mode)\n\nכאן תוכל לנהל את המערכת ולבדוק את כל הפונקציות.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 סטטיסטיקה (בקרוב)', callback_data: 'admin_stats' }],
          [{ text: '👥 רשימת מסטרים', callback_data: 'admin_masters' }],
          [{ text: '🧪 בדיקת Studio AI', web_app: { url: `${process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app'}?v=2.2.9` } }],
          [{ text: '🚀 TEST V2.2.9 (Force Update)', web_app: { url: `${process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app'}?v=2.2.9` } }]
        ]
      }
    });
  });

  bot.command('force_trend', async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) {
      return ctx.reply('❌ אין לך הרשאות למצב זה.');
    }
    await ctx.reply('🚀 Запуск принудительного анализатора трендов Beauty-сферы (Loki Mode)...');
    try {
      await trendAnalyzer.runWeeklyAnalysis(ctx);
    } catch (e) {
      await ctx.reply('❌ Произошла ошибка при анализе.');
    }
  });

  // Обработка одобрения
  bot.action(/^approve_(\d+)$/, async (ctx) => {
    const targetId = ctx.match?.[1];
    if (!targetId || ctx.from?.id !== ADMIN_ID) return;

    try {
      if (supabase) {
        await supabase.from('masters').update({ status: 'approved' }).eq('telegram_id', targetId);
      }
      await ctx.answerCbQuery('✅ אושר בהצלחה!');
      await ctx.editMessageText(`✅ המשתמש ${targetId} אושר.`);
      await ctx.telegram.sendMessage(targetId, '🎉 בשורות טובות! החשבון שלך אושר על ידי המנהל. עכשיו כל האפשרויות פתוחות בפניך!');
    } catch (e) {
      console.error(e);
      ctx.answerCbQuery('❌ שגיאה');
    }
  });

  bot.action(/^reject_(\d+)$/, async (ctx) => {
    const targetId = ctx.match[1];
    if (ctx.from?.id !== ADMIN_ID) return;
    await ctx.answerCbQuery('❌ נדחה');
    await ctx.editMessageText(`❌ המשתמש ${targetId} נדחה.`);
  });

  bot.action('admin_masters', async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    if (!supabase) return ctx.reply('Database error');

    const { data: masters, error } = await supabase.from('masters').select('*').limit(20);
    if (error) return ctx.reply('Error fetching masters');

    let text = '👥 **רשימת מסטרים:**\n\n';
    masters.forEach(m => {
      text += `• ${m.name} (${m.business_name || 'אין שם'}) - ${m.status}\n`;
    });

    ctx.reply(text);
  });

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
            [{ text: '✨ סטודיו AI', web_app: { url: 'https://beautyos-ai-v2.vercel.app/?v=2.2.9' } }, { text: '📝 הרשמה' }],
            [{ text: '🖼️ תיק עבודות' }, { text: '⚙️ הגдерות' }]
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
