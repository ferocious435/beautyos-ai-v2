import { VercelRequest, VercelResponse } from '@vercel/node';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

// Vercel Config: Disable Body Parser for Raw Body Security Verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Linear Worker for Stability (v44)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { verifyQStashSignature } = await import('./_lib/security.js');
  const isAuthorized = await verifyQStashSignature(req);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature' });
  }

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { chatId, messageId, fileUrl, fileId, caption } = req.body;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  if (!chatId || !fileUrl) {
    return res.status(400).send('Missing required fields');
  }
  try {
    const parsedFileUrl = new URL(String(fileUrl));
    if (parsedFileUrl.protocol !== 'https:' || parsedFileUrl.hostname !== 'api.telegram.org') {
      return res.status(400).json({ error: 'Unsupported file URL' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid file URL' });
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
           status: 'preparing_ai'
         },
         updated_at: new Date().toISOString()
      });
    }

    // 🚀 STEP 3: TRIGGER BACKGROUND RETOUCH (v66.3)
    console.log('[AI-Worker] Triggering background retouch-worker...');
    const { enqueueRetouchProcessing } = await import('./_lib/qstash.js');
    await enqueueRetouchProcessing(chatId, fileUrl, fileId);

    // 🚀 STEP 4: SHOW MASTER-PANEL (Premium Unified Design Hub v52.4)
    const fId = fileId || 'image';
    const menu = {
      inline_keyboard: [
        [
          { text: '💎 לוגו: ❌', callback_data: `design_LOGO_#_${fId.slice(-6)}` }
        ],
        [
          { text: '🚀 אישור והמשך לעיבוד', callback_data: `design_DONE_#_${fId.slice(-6)}` }
        ]
      ]
    };

    await bot.telegram.sendPhoto(chatId, { source: imageData }, {
      caption: `🎨 **סטודיו BeautyOS פתוח!**\n\nהתמונה התקבלה. אפשר להוסיף לוגו, או להמשיך ישר לבחירת פורמט וריטוש.\nלא יתווסף טקסט שיווקי על התמונה.`,
      parse_mode: 'Markdown',
      reply_markup: menu
    });

    console.log('[AI-Worker v52.4] Success: Master-Panel Sent');
    return res.status(200).send('Completed');

  } catch (err: unknown) {
    console.error('AI-Worker Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    try {
      await bot.telegram.sendMessage(chatId, `❌ **שגיאת עיבוד:** המערכת נתקלה вבעיה טכנית: ${message}`).catch(() => {});
    } catch (e) {
      console.error('Failed to notify error to Telegram:', e);
    }
    return res.status(500).send(message);
  }
}
