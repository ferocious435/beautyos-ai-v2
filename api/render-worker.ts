import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import { getSupabase } from './_lib/supabase.js';
import { generateSocialPost } from './_lib/graphic-engine.js';

// Vercel Config: Disable Body Parser for Raw Body Security Verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { verifyQStashSignature } = await import('./_lib/security.js');
  const isAuthorized = await verifyQStashSignature(req);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature' });
  }

  const { chatId, formatType } = req.body;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  console.log(`[Render-Worker v67.2] Fast Render Request: ${formatType} for chat: ${chatId}`);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase integration missing');

    // 🏆 POLLING SYSTEM v66.3: Wait for Background Retouch (max 45s)
    let sessionData: any = null;
    let attempts = 0;
    const maxAttempts = 15; // 15 * 3s = 45s
    
    while (attempts < maxAttempts) {
      const { data: session } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('user_id', chatId)
        .single();

      if (session?.session_data?.enhancedMaster) {
        sessionData = session;
        console.log(`[Render-Worker] Cache HIT after ${attempts * 3}s`);
        break;
      }

      if (attempts === 0) {
        await bot.telegram.sendMessage(chatId, '🎨 **ה-AI עדיין משלים את הרטוש...**\nאנחנו כבר מסיימים, רק עוד כמה שניות! ✨');
      }

      console.log(`[Render-Worker] Cache MISS. Attempt ${attempts+1}/${maxAttempts}. Waiting 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      attempts++;
    }

    if (!sessionData) {
      // Fallback: If AI is too slow, use original buffer but notify
      const { data: finalCheck } = await supabase.from('bot_sessions').select('*').eq('user_id', chatId).single();
      if (!finalCheck?.session_data?.originalBuffer) {
        await bot.telegram.sendMessage(chatId, '❌ מצטערים, התמונה אבדה בתהליך. אנא שלחו שוב.');
        return res.status(404).send('Not Found');
      }
      sessionData = finalCheck;
      await bot.telegram.sendMessage(chatId, '⚠️ **הרטוש המתקדם לוקח מעט יותר זמן מהרגיל.**\nמייצרים גרסה נקייה בינתיים...');
    }

    const { session_data } = sessionData;
    const workingBuffer = session_data.enhancedMaster 
      ? Buffer.from(session_data.enhancedMaster, 'base64')
      : Buffer.from(session_data.originalBuffer, 'base64');

    // 🚀 TARGET FORMAT DETERMINATION
    let socialFormat: any = 'SQUARE_1_1';
    let formatName = 'Facebook (1:1)';
    if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
    if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
    if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

    console.log(`[Render-Worker] Fast Rendering: ${formatName}`);

    // 🏢 DYNAMIC BRANDING
    const { data: userData } = await supabase.from('users')
      .select('business_name')
      .eq('telegram_id', Number(chatId))
      .single();
    const realBusinessName = userData?.business_name || 'Beauty Expert';

    // 🚀 STACKING v61: PRO COMPOSITION ENGINE (Dynamic & Collision-Free)
    const rawOverlays = session_data.lastOverlay || [];
    const groupedMap = new Map<string, any>();
    rawOverlays.forEach((line: any) => {
      const cleanText = (line.text || '').replace(/[✨*]/g, '').trim();
      if (!cleanText) return;
      if (groupedMap.has(line.type)) groupedMap.get(line.type).text += '\n' + cleanText;
      else groupedMap.set(line.type, { ...line, text: cleanText });
    });

    const usedPositions: any[] = [];
    const overlays = Array.from(groupedMap.values()).map((line: any) => {
      let x = line.xPosition || (line.type === 'PRICE' ? 0.9 : (line.type === 'LOGO' ? 0.05 : 0.5));
      let y = line.yPosition;
      let align: any = line.textAlign || (line.type === 'PRICE' ? 'right' : (line.type === 'LOGO' ? 'left' : 'center'));

      if (y === undefined) {
        if (line.type === 'TITLE') y = 0.12;
        else if (line.type === 'PRICE') y = 0.22;
        else if (line.type === 'PROMO') y = 0.82;
        else if (line.type === 'LOGO') y = 0.94;
        else y = 0.5;
      }

      // --- STACKING v61: COLLISION RESOLUTION ---
      const step = 0.12; 
      const thresholdY = 0.10;
      let attempts = 0;
      while (usedPositions.some(p => Math.abs(p.y - y) < thresholdY && Math.abs(p.x - x) < 0.35) && attempts < 5) {
        if (y < 0.4) y += step; // Сдвигаем вниз, если в верхней части
        else y -= step;         // Сдвигаем вверх, если в нижней части
        attempts++;
      }
      y = Math.max(0.06, Math.min(0.94, y));
      usedPositions.push({ x, y });

      return { 
        ...line, 
        xPosition: x, 
        yPosition: y, 
        textAlign: align,
        rotation: (line.type === 'PRICE' ? -2 : (line.type === 'PROMO' ? 1.5 : (Math.random() * 1.6 - 0.8)))
      };
    });

    const finalResult = await generateSocialPost(workingBuffer, {
      format: socialFormat,
      businessName: realBusinessName,
      overlay: overlays, 
      style: session_data.lastStyle || { preset: 'GLASSMorphism', primaryColor: '#FFFFFF' },
      theme: 'ORIGINAL_CLEAN'
    });

    const captionText = session_data.lastPost || 'התוצאה מוכנה! ✨';
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(captionText)}`;

    const shareButtons = [
      [
        { text: '📲 פרסם בסטטוס ווטסאפ', url: shareUrl },
        { text: '📸 פתח אינסטגרם', url: `https://www.instagram.com/` }
      ]
    ];

    await bot.telegram.sendPhoto(chatId, { source: finalResult }, {
      caption: captionText,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: shareButtons }
    });

    console.log('[Render-Worker] ✅ SUCCESS: Social Post Sent');
    return res.status(200).send('Render Complete');

  } catch (err: any) {
    console.error('[Render-Worker Error]:', err);
    await bot.telegram.sendMessage(chatId, `❌ **שגיאת מערכת:** ${err.message}`).catch(() => {});
    return res.status(500).send(err.message);
  }
}
