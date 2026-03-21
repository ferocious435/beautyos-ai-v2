import { Scenes } from 'telegraf';
import { BotContext } from '../context.js';
import { supabase } from '../services/supabase.js';

export const REGISTRATION_SCENE = 'REGISTRATION_SCENE';

export const registrationScene = new Scenes.WizardScene<BotContext>(
  REGISTRATION_SCENE,
  // 1. Имя
  async (ctx) => {
    await ctx.reply('✨ ברוכים הבאים ל-BeautyOS AI v2! ✨\nבואו נגדיר את הפרופיל שלכם. איך קוראים לכם?');
    return ctx.wizard.next();
  },
  // 2. Телефон
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      return ctx.reply('נא להזין את השם שלכם כטקסט.');
    }
    (ctx.wizard.state as any).name = ctx.message.text;
    await ctx.reply('נעים להכיר! מה מספר הטלפון שלכם?');
    return ctx.wizard.next();
  },
  // 3. Финализация
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      return ctx.reply('נא להזין מספר טלפון.');
    }
    const phone = ctx.message.text.replace(/[\s\-\(\)]/g, '');
    const { name } = ctx.wizard.state as any;
    const telegramId = ctx.from?.id;

    try {
      if (supabase) {
        const { error } = await supabase
          .from('masters')
          .insert([{ 
            telegram_id: telegramId?.toString(), 
            name, 
            phone 
          }]);
        if (error) throw error;
      } else {
        console.warn('⚠️ Supabase не подключен, сохранение в локальный лог.');
      }

      await ctx.reply(`🎉 ההרשמה הושלמה, ${name}! עכשיו אפשר לשלוח תמונות של עבודות כדי לקבל שיפור אוטומטי ופוסטים מוכנים.`);
      return ctx.scene.leave();
    } catch (error) {
      console.error('Registration Error:', error);
      await ctx.reply('היתה שגיאה בשמירת הנתונים. אבל אל דאגה, תוכלו להשתמש בפונקציות ה-AI הבסיסיות!');
      return ctx.scene.leave();
    }
  }
);
