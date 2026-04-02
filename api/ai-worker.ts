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

    // 🚀 STEP 3: SHOW DESIGN MENU (Premium Design Studio Flow)
    const fId = fileId || 'image';
    const menu = {
      inline_keyboard: [
        [
          { text: '💰 הוסף מחיר', callback_data: `design_PRICE_#_${fId.slice(-6)}` },
          { text: '🖌 הוסף כותרת', callback_data: `design_TITLE_#_${fId.slice(-6)}` }
        ],
        [
          { text: '💎 הוסף לוגו/שם', callback_data: `design_LOGO_#_${fId.slice(-6)}` },
          { text: '🎁 מבצע מיוחד', callback_data: `design_PROMO_#_${fId.slice(-6)}` }
        ],
        [
          { text: '✨ סיימתי! בחר רשת חברתית', callback_data: `design_DONE_#_${fId.slice(-6)}` }
        ]
      ]
    };

    await bot.telegram.sendMessage(chatId, `🎨 **סטודיו BeautyOS פתוח!**\n\nהתמונה התקבלה. השתמש בכפתורים כדי להוסיף טקסט, מחיר או לוגו.\nבסיום, נבצע **רטוש AI משולב** (Nano Banana) ליצירת הפוסט המושלם. ✨`, {
      parse_mode: 'Markdown',
      reply_markup: menu
    });

    console.log('[AI-Worker v52.2] Success: Design Menu Sent');
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
