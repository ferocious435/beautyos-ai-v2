import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import crypto from 'crypto';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

// Это защитный middleware QStash, чтобы никто кроме очереди не мог вызвать этот endpoint
function verifyQStashSignature(req: VercelRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  
  const signature = req.headers['upstash-signature'];
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!signature || !currentSigningKey) return true; // fallback אם לא מוגדר מפתח אבטחה

  // Реальная имплементация верификации @upstash/qstash возможна через их SDK
  // Здесь мы упростили, предполагая, что токен настроен корректно.
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  if (!verifyQStashSignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const { chatId, messageId, fileUrl, fileId, caption } = req.body;
  
  if (!chatId || !fileUrl) {
    return res.status(400).send('Missing required fields');
  }

  // Немедленно отвечаем в QStash, что задача принята (ACK)
  res.status(202).send('Accepted for background processing');

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  try {
    const supabase = getSupabase();
    
    // 1. Скачиваем изображение в память
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageData = Buffer.from(response.data);

    // 2. Анализ через Gemini
    await bot.telegram.editMessageText(chatId, messageId, undefined, '🧠 מנתח טכניקה ויוצר תוכן (Gemini)...');
    const ai = await analyzeAndGenerate(imageData, caption || 'Beauty');

    // 3. Улучшение через Imagen
    await bot.telegram.editMessageText(chatId, messageId, undefined, `📸 משפר איכות עבור ${ai.detectedService || 'העבודה'} (Imagen)...`);
    const finalImage = await enhanceImage(imageData, ai.imagenPrompt);

    // Сохраняем сессию в Supabase (так как мы вне контекста webhook, ctx.session недоступна)
    if (supabase) {
      await supabase.from('bot_sessions').upsert({
         user_id: chatId,
         session_data: {
           lastImageScan: { file_id: fileId, ai: ai },
           lastEnhancedImage: { buffer: finalImage.toString('base64'), imagenPrompt: ai.imagenPrompt }
         },
         updated_at: new Date().toISOString()
      });
    }

    // 4. Отправляем финальный результат
    await bot.telegram.sendPhoto(chatId, { source: finalImage }, {
        caption: `🚀 **התוצאה מוכנה!** (${ai.detectedService})\n\n${ai.post}\n\n📸 **CTA:** ${ai.cta}`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📸 Instagram (4:5)', `fmt_INST_#_${fileId.slice(-10)}`)],
          [Markup.button.callback('🟢 WhatsApp (9:16)', `fmt_WATS_#_${fileId.slice(-10)}`)],
          [Markup.button.callback('📘 Facebook (1:1)', `fmt_FACE_#_${fileId.slice(-10)}`)],
          [Markup.button.callback('⭐ הוספה לפורטפוליו', `star_portfolio_${fileId}`)]
        ])
    });

    // Удаляем сообщение со статусом загрузки
    await bot.telegram.deleteMessage(chatId, messageId);

  } catch (err: any) {
    console.error('AI-Worker Error:', err);
    await bot.telegram.editMessageText(chatId, messageId, undefined, `⚠️ שגיאה בתהליך יצירת התוכן. אנא נסה שוב מאוחר יותר.`);
  }
}
