import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../context.js';
import { geminiService } from '../services/geminiService.js';
import { PromptEngineService } from '../services/promptEngine.js';
import axios from 'axios';

export const CONTENT_SCENE = 'CONTENT_SCENE';

export const contentScene = new Scenes.BaseScene<BotContext>(CONTENT_SCENE);

contentScene.enter(async (ctx) => {
  await ctx.replyWithHTML(
    '📺 <b>ברוכים הבוס לסטודיו התוכן!</b>\n\n' +
    'כאן נוכל ליצור תוכן שיווקי מושלם לעסק שלך.\n\n' +
    '<b>בחר באחת האפשרויות:</b>\n' +
    '✍️ <b>כתיבת פוסט</b> — כתיבת תוכן לפי נושא ספציפי.\n' +
    '🖼️ <b>ניתוח תמונה</b> — העלאת תמונה ליצירת פוסט אוטומטי.\n' +
    '⬅️ <b>חזרה</b> — חזרה לתפריט הראשי.',
    Markup.inlineKeyboard([
      [Markup.button.callback('✍️ כתיבת פוסט לפי נושא', 'gen_text')],
      [Markup.button.callback('🖼️ ניתוח תמונה וכתיבת פוסט', 'gen_vision')],
      [Markup.button.callback('⬅️ חזרה לתפריט הראשי', 'exit_scene')]
    ])
  );
});

contentScene.action('gen_text', async (ctx) => {
  ctx.answerCbQuery();
  ctx.session.state = 'WAITING_FOR_TOPIC';
  await ctx.reply('על מה נכתוב היום? (לדוגמה: "מבצע לפסח", "טרנדים בלק ג\'ל 2026")');
});

contentScene.action('gen_vision', async (ctx) => {
  ctx.answerCbQuery();
  ctx.session.state = 'WAITING_FOR_PHOTO';
  await ctx.reply('שלחו לי תמונה של העבודה שלכם, ואני אבצע ניתוח מקצועי ואכתוב עבורכם פוסט:');
});

contentScene.on('text', async (ctx) => {
  if (ctx.session.state !== 'WAITING_FOR_TOPIC') return;
  const topic = ctx.message.text;
  await ctx.reply('⏳ Генерирую пост...');
  
  const prompt = `Напиши идеальный пост для бьюти-мастера на тему: "${topic}". Используй живой человеческий язык, добавь эмодзи и хэштеги.`;
  const response = await geminiService.generateText(prompt);
  
  await ctx.reply(`✨ *Ваш пост:*\n\n${response}`, { parse_mode: 'Markdown' });
  delete ctx.session.state;
});

contentScene.action('exit_scene', (ctx) => {
  ctx.answerCbQuery();
  return ctx.scene.leave();
});
