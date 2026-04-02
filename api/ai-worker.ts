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
    // 🧼 SILENT MODE (v51.1): No auto-processing. Zero initial AI cost.
    // 1. Download
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const imageData = Buffer.from(response.data);

    // 2. Persistence (Storage for later AI Analysis + Retouching)
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('bot_sessions').upsert({
         user_id: chatId,
         session_data: {
           originalBuffer: imageData.toString('base64'),
           lastImageId: fileId,
           status: 'pending_selection'
         },
         updated_at: new Date().toISOString()
      });
    }

    // 3. Final Send: Selection Buttons
    await bot.telegram.sendMessage(chatId, `📸 **התמונה התקבלה! עבור איזו רשת חברתית נכין אותה?**`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📸 Instagram (4:5)', callback_data: 'format_INST' }],
          [{ text: '📱 WhatsApp Story (9:16)', callback_data: 'format_WATS' }],
          [{ text: '👥 Facebook (1:1)', callback_data: 'format_FACE' }]
        ]
      }
    });

    console.log('[AI-Worker v51.1] Silent Success (Stored Original Buffer)');

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
