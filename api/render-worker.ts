import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { chatId, formatType } = req.body;
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

  console.log(`[Render-Worker v51.3] Starting Background Task: ${formatType} for chat: ${chatId}`);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase integration missing');

    // 🔍 1. FETCH ORIGINAL (v51.1 Zero-Waste Strategy)
    const { data: session, error: sessErr } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', chatId)
      .single();

    if (sessErr || !session?.session_data?.originalBuffer) {
      await bot.telegram.sendMessage(chatId, '❌ מצטערים, המידע על התמונה אבד. אנא שלחו תמונה חדשה.');
      return res.status(404).send('Session not found');
    }

    const originalBuffer = Buffer.from(session.session_data.originalBuffer, 'base64');

    // 🧠 2. ADVANCED ANALYSIS (Gemini 3.1 Pro Preview)
    console.log('[Render-Worker] Running Gemini 3.1 Pro Analysis...');
    const aiResult = await analyzeAndGenerate(originalBuffer, 'Luxury Beauty Design');

    // 📸 3. HIGH-FIDELITY RETOUCH (NANO BANANA PRO)
    console.log('[Render-Worker] Running NANO BANANA PRO Enhancement...');
    let finalBaseBuffer;
    try {
      finalBaseBuffer = await enhanceImage(originalBuffer, aiResult.imagenPrompt);
    } catch (err: any) {
      console.warn('[Render-Worker] Retouch failed, using original:', err.message);
      finalBaseBuffer = originalBuffer;
    }

    // 🎨 4. DESIGN & RENDER
    console.log('[Render-Worker] Rendering final design...');
    const { generateSocialPost } = await import('./_lib/graphic-engine.js');
    
    let socialFormat: any = 'SQUARE_1_1';
    let formatName = 'Facebook (1:1)';
    
    if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
    if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
    if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

    const designedBuffer = await generateSocialPost(finalBaseBuffer, {
      format: socialFormat,
      businessName: 'Beauty Expert',
      overlay: aiResult.overlay || [],
      theme: 'ORIGINAL_CLEAN'
    });

    // 🚀 5. FINAL SEND
    await bot.telegram.sendPhoto(chatId, { source: designedBuffer }, {
      caption: `🚀 **התוצאה מוכנה!**\n📐 פורמט: **${formatName}**\n\n📝 **פוסט:** ${aiResult.post}\n\n✨ המערכת השתמשה ב-Gemini 3.1 Pro וב-Nano Banana Pro לאיכות מקסימלית.`,
      parse_mode: 'Markdown'
    });

    console.log('[Render-Worker v51.3] Background Task Complete Success');
    return res.status(200).send('Render Complete');

  } catch (err: any) {
    console.error('[Render-Worker Error]:', err);
    await bot.telegram.sendMessage(chatId, `❌ **שגיאת מערכת:** ${err.message}`).catch(() => {});
    return res.status(500).send(err.message);
  }
}
