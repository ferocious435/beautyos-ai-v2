import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

// Linear Worker for Stability (v44)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { chatId, messageId, fileUrl, fileId, caption } = req.body;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  if (!chatId || !fileUrl) {
    return res.status(400).send('Missing required fields');
  }

  console.log(`[AI-Worker v44] Starting processing for chat: ${chatId}`);

  try {
    // 📢 IMMEDIATE FEEDBACK: Linear Start
    await bot.telegram.sendMessage(chatId, `📡 **מערכת הענן קיבלה את הבקשה!** (התחלת עיבוד...)`).catch(() => {});
    
    // 1. Download
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageData = Buffer.from(response.data);

    // 2. Analysis
    await bot.telegram.sendMessage(chatId, `🧠 **מנתח טכניקה ויוצר תוכן (Gemini)...**`).catch(() => {});
    const ai = await analyzeAndGenerate(imageData, caption || 'Beauty');

    // 3. Enhancement (Imagen)
    await bot.telegram.sendMessage(chatId, `📸 **משפר איכות עבור ${ai.detectedService || 'העבודה'}...**`).catch(() => {});
    
    let finalImage = imageData;
    let retouchStatus = '✨ **AI Retouch Applied**';
    try {
      finalImage = await enhanceImage(imageData, ai.imagenPrompt);
    } catch (e: any) {
      console.warn('[AI-Worker] Enhancement failed, using original', e.message);
      retouchStatus = '⚠️ **(Original Quality: AI Busy)**';
    }

    const isRetouched = finalImage.length !== imageData.length;
    
    // 4. Persistence (Supabase)
    const supabase = getSupabase();
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

    // 5. Final Send (Telegram)
    await bot.telegram.sendPhoto(chatId, { source: finalImage }, {
        caption: `🚀 **התוצאה מוכנה!** (${ai.detectedService})\n\n${ai.post}\n\n📸 **Status:** ${retouchStatus}\n✨ **Action:** ${ai.cta}`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💰 הוסף מחיר', `design_PRICE_#_${fileId.slice(-6)}`), Markup.button.callback('🖌 הוסף כותרת', `design_TITLE_#_${fileId.slice(-6)}`)],
          [Markup.button.callback('💎 הוסף לוגו/שם', `design_LOGO_#_${fileId.slice(-6)}`), Markup.button.callback('🎁 מבצע מיוחד', `design_PROMO_#_${fileId.slice(-6)}`)],
          [Markup.button.callback('✨ סיימתי / ללא טקסט', `design_DONE_#_${fileId.slice(-6)}`)]
        ])
    });

    // Success response to QStash
    return res.status(200).send('Completed');

  } catch (err: any) {
    console.error('AI-Worker Error:', err);
    try {
      await bot.telegram.sendMessage(chatId, `❌ **שגיאת עיבוד:** המערכת נתקלה בבעיה טכנית: ${err.message}`).catch(() => {});
    } catch (e) {
      console.error('Failed to notify error to Telegram:', e);
    }
    return res.status(500).send(err.message);
  }
}
