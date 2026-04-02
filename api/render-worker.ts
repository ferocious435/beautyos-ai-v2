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

    const { data: session, error: sessErr } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', chatId)
      .single();

    if (sessErr || !session?.session_data?.originalBuffer) {
      await bot.telegram.sendMessage(chatId, '❌ מצטערים, המידע על התמונה אבד. אנא שלחו תמונה חדשה.');
      return res.status(404).send('Session not found');
    }

    const { generateSocialPost } = await import('./_lib/graphic-engine.js');
    let enhancedMaster: Buffer;
    let imagenPrompt = 'Luxury Beauty Design';

    // 🏆 CONSISTENCY SYSTEM (v52.2): Check for cached Master-File
    if (session.session_data.enhancedMaster) {
      console.log('[Render-Worker v52.2] Cache HIT: Using existing Master-File');
      enhancedMaster = Buffer.from(session.session_data.enhancedMaster, 'base64');
    } else {
      console.log('[Render-Worker v52.2] Cache MISS: Creating new Master-File');
      const originalBuffer = Buffer.from(session.session_data.originalBuffer, 'base64');

      // 1. Apply UI Design to Original (Integrated Processing)
      console.log('[Render-Worker] Applying design layer to original...');
      const designedOriginal = await generateSocialPost(originalBuffer, {
        format: 'ORIGINAL',
        overlay: session.session_data.lastOverlay || [],
        theme: 'WATERMARK'
      });

      // 2. AI Analysis
      console.log('[Render-Worker] Running Gemini 3.1 Pro Analysis...');
      const aiResult = await analyzeAndGenerate(designedOriginal, 'Professional Luxury Beauty');
      imagenPrompt = aiResult.imagenPrompt;

      // 3. High-Fidelity Retouch (NANO BANANA PRO)
      console.log('[Render-Worker] Running NANO BANANA PRO on Designed Original...');
      try {
        enhancedMaster = await enhanceImage(designedOriginal, imagenPrompt);
      } catch (err: any) {
        console.warn('[Render-Worker] Retouch failed, using current draft:', err.message);
        enhancedMaster = designedOriginal;
      }

      // 4. Persistence (Save Master-File for consistency in next clicks)
      await supabase.from('bot_sessions').update({
        session_data: {
          ...session.session_data,
          enhancedMaster: enhancedMaster.toString('base64'),
          lastImagenPrompt: imagenPrompt,
          lastPost: aiResult.post
        }
      }).eq('user_id', chatId);
    }

    // 🎨 FINAL SOCIAL RENDER (Formatting Only)
    console.log('[Render-Worker] Preparing final social crop...');
    
    let socialFormat: any = 'SQUARE_1_1';
    let formatName = 'Facebook (1:1)';
    
    if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
    if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
    if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

    const finalResult = await generateSocialPost(enhancedMaster, {
      format: socialFormat,
      businessName: 'Beauty Expert',
      overlay: [], // Already integrated into master
      theme: 'ORIGINAL_CLEAN'
    });

    const captionText = session.session_data.lastPost || 'התוצאה מוכנה!';

    // 🚀 5. FINAL SEND
    await bot.telegram.sendPhoto(chatId, { source: finalResult }, {
      caption: `🚀 **התוצאה מוכנה!**\n📐 פורמט: **${formatName}**\n\n📝 **פוסט:** ${captionText}\n\n✨ רטוש AI ועיצוב משולב (3.1 Pro + Nano Banana).`,
      parse_mode: 'Markdown'
    });

    console.log('[Render-Worker v52.2] Success Complete');
    return res.status(200).send('Render Complete');

  } catch (err: any) {
    console.error('[Render-Worker Error]:', err);
    await bot.telegram.sendMessage(chatId, `❌ **שגיאת מערכת:** ${err.message}`).catch(() => {});
    return res.status(500).send(err.message);
  }
}
