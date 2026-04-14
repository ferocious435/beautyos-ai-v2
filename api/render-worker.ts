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

    // 🚀 UNIFIED RENDERING via Processor (v1.1)
    const design = {
      overlay: session_data.lastOverlay || [],
      style: session_data.lastStyle || { preset: 'GLASSMorphism', primaryColor: '#FFFFFF' },
      post: session_data.lastPost || '',
      imagenPrompt: session_data.lastImagenPrompt || '',
      detectedService: 'Beauty Specialist'
    };

    const finalResult = await processor.render(
      workingBuffer, 
      socialFormat, 
      design as any, 
      realBusinessName
    );

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
