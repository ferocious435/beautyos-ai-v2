import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import crypto from 'crypto';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

import { Receiver } from '@upstash/qstash';

async function verifyQStashSignature(req: any, chatId: string, messageId: number, bot: Telegraf): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') return true;

  const signature = req.headers['upstash-signature'] as string;
  const body = JSON.stringify(req.body);
  
  const currentKey = (process.env.QSTASH_CURRENT_SIGNING_KEY || '').trim();
  const nextKey = (process.env.QSTASH_NEXT_SIGNING_KEY || '').trim();

  console.log(`[QStash Verify] Keys present: current=${currentKey.length}chars, next=${nextKey.length}chars`);

  if (!currentKey || !nextKey) {
    console.error('[QStash Verify] MISSING SIGNING KEYS!');
    await bot.telegram.sendMessage(chatId, `⚠️ שגיאת תצורה: מפתחות חתימה חסרים במערכת.`);
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  // Определяем URL из WEBAPP_URL (должен совпадать с URL, куда QStash отправляет запрос)
  const appUrl = (process.env.WEBAPP_URL || '').trim().replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const hostUrl = `${protocol}://${host}/api/ai-worker`;
  const currentUrl = appUrl ? `${appUrl}/api/ai-worker` : hostUrl;

  console.log(`[QStash Verify] URL for verification: ${currentUrl} (host: ${hostUrl})`);

  try {
    const isValid = await receiver.verify({
      signature,
      body,
      url: currentUrl,
    });

    if (!isValid) {
      console.error('QStash signature mismatch. URL used:', currentUrl);
      await bot.telegram.sendMessage(chatId, `⚠️ שגיאת אימות: לא ניתן לאשר את מקור הבקשה (401).`);
    }
    return isValid;
  } catch (err: any) {
    console.error('Receiver verify crashed:', err);
    await bot.telegram.sendMessage(chatId, `⚠️ שגיאה בבדיקת אבטחה: ${err.message}`);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { chatId, messageId, fileUrl, fileId, caption } = req.body;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  // 1. Проверка подписи от QStash
  if (!(await verifyQStashSignature(req, chatId, messageId, bot))) {
    return res.status(401).send('Invalid signature');
  }

  if (!chatId || !fileUrl) {
    return res.status(400).send('Missing required fields');
  }

  // Используем асинхронную обработку, чтобы Vercel не убил функцию после res.send
  const { waitUntil } = await import('@vercel/functions');
  
  waitUntil((async () => {
    try {
      // 1. АБТХА (Безопасность)
      await bot.telegram.editMessageText(chatId, messageId, undefined, '🔒 אבטחה תקינה! מתחיל טיפול בבקשה...');
      
      const supabase = getSupabase();
      
      // 2. Скачивание (Download)
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const imageData = Buffer.from(response.data);

      // 3. Анализ (Gemini Analysis)
      await bot.telegram.editMessageText(chatId, messageId, undefined, '🧠 מנתח טכניקה ויוצר תוכן (Gemini)...');
      const ai = await analyzeAndGenerate(imageData, caption || 'Beauty');

      // 4. Улучшение (Imagen Enhancement + Heartbeat)
      await bot.telegram.editMessageText(chatId, messageId, undefined, `📸 משפר איכות עבור ${ai.detectedService || 'העבודה'} (Imagen)...`);
      
      const heartbeat = setTimeout(() => {
        bot.telegram.editMessageText(chatId, messageId, undefined, `⏳ המאסטר, הריטוץ (Imagen 3 Ultra) לוקח קצת זמן... אנחנו בשיא העבודה! ✨`).catch(() => {});
      }, 10000);

      const startEnhance = Date.now();
      let finalImage = imageData;
      let retouchStatus = '✨ **AI Retouch Applied**';
      try {
        finalImage = await enhanceImage(imageData, ai.imagenPrompt);
      } catch (e: any) {
        console.warn('[AI-Worker] Enhancement failed, using original', e.message);
        retouchStatus = '⚠️ **(Original Quality: AI Busy)**';
      } finally {
        clearTimeout(heartbeat);
      }

      const isRetouched = finalImage.length !== imageData.length;
      console.log(`[AI-Worker] Enhancement took ${Date.now() - startEnhance}ms (Retouched: ${isRetouched})`);

      // Сохранение в Supabase
      if (supabase) {
        await supabase.from('bot_sessions').upsert({
           user_id: chatId,
           session_data: {
             lastImageScan: { file_id: fileId, ai: ai, enhancedFileId: fileId },
             lastEnhancedImage: { 
               buffer: finalImage.toString('base64'), 
               imagenPrompt: ai.imagenPrompt,
               status: isRetouched ? 'enhanced' : 'original'
             },
             lastOverlay: ai.overlay || []
           },
           updated_at: new Date().toISOString()
        });
      }

      // 5. Отправка (Telegram Response)
      await bot.telegram.sendPhoto(chatId, { source: finalImage }, {
          caption: `🚀 **התוצאה מוכנה!** (${ai.detectedService})\n\n${ai.post}\n\n📸 **Status:** ${retouchStatus}\n✨ **Action:** ${ai.cta}`,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💰 הוסף מחיר', `design_PRICE_#_${fileId.slice(-6)}`), Markup.button.callback('🖌 הוסף כותרת', `design_TITLE_#_${fileId.slice(-6)}`)],
            [Markup.button.callback('💎 הוסף לוגו/שם', `design_LOGO_#_${fileId.slice(-6)}`), Markup.button.callback('🎁 מבצע מיוחד', `design_PROMO_#_${fileId.slice(-6)}`)],
            [Markup.button.callback('✨ סיימתי / ללא טקסט', `design_DONE_#_${fileId.slice(-6)}`)]
          ])
      });

      // Удаляем сообщение со статусом
      await bot.telegram.deleteMessage(chatId, messageId);

    } catch (err: any) {
      console.error('AI-Worker Background Error:', err);
      try {
        await bot.telegram.editMessageText(chatId, messageId, undefined, `❌ חלה שגיאה בעיבוד התמונה: ${err.message}`);
      } catch (e) {
        console.error('Failed to notify error to Telegram:', e);
      }
    }
  })());

  // Немедленно отвечаем QStash, что задача принята (ACK)
  return res.status(202).send('Accepted for background processing');
}
