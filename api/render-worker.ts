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
        overlay: [], // ✅ Moved to Post-Process for 100% clarity
        theme: 'WATERMARK'
      });

      // 2. AI Analysis & Multi-Modal Expansion Generation (v52.8)
      console.log('[Render-Worker] Running Gemini 3.1 Pro Outpainting Analysis...');
      const uiPromptAddon = (session.session_data.lastOverlay || []).length > 0
        ? ` IMPORTANT: This image has price/title design. Integrate it as premium studio graphics. 
           SHARPEN THE TEXT OVERLAYS.`
        : '';
      
      const expansionPrompt = `
        OUTPAINTING & CREATIVE EXPANSION MODE.
        Task: Center image is nails/beauty art. 
        Action: PROFESSIONALLY FILL the black surrounding areas with a realistic luxury beauty studio background. 
        Style: Cinematic lighting, matching the textures of the center piece. 
        ${uiPromptAddon}
      `;

      const aiResult = await analyzeAndGenerate(designedOriginal, expansionPrompt);
      imagenPrompt = aiResult.imagenPrompt;

      // 3. High-Fidelity Retouch (NANO BANANA PRO)
      console.log('[Render-Worker] Running NANO BANANA PRO on Designed Original...');
      enhancedMaster = await enhanceImage(designedOriginal, imagenPrompt);

      // 4. Persistence
      await supabase.from('bot_sessions').update({
        session_data: {
          ...session.session_data,
          enhancedMaster: enhancedMaster.toString('base64'),
          lastImagenPrompt: imagenPrompt,
          lastPost: aiResult.post
        }
      }).eq('user_id', chatId);
      
      // Update local variable for the first render
      session.session_data.lastPost = aiResult.post;
    }

    // 🎨 FINAL SOCIAL RENDER (Formatting Only)
    console.log('[Render-Worker] Preparing final social crop...');
    
    let socialFormat: any = 'SQUARE_1_1';
    let formatName = 'Facebook (1:1)';
    
    if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
    if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
    if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

    // 🎨 FINAL RENDER (POST-PROCESS DESIGN - v52.9 FIX)
    // We apply overlays AFTER AI retouching to prevent erasure
    const finalResult = await generateSocialPost(enhancedMaster, {
      format: socialFormat,
      businessName: 'Beauty Expert',
      overlay: session.session_data.lastOverlay || [], // ✅ Guaranteed Visibility
      theme: 'ORIGINAL_CLEAN'
    });

    const captionText = session.session_data.lastPost || 'התוצאה מוכנה!';
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(captionText)}`;

    // 🚀 SHARE BUTTONS (v52.7)
    const shareButtons = [
      [
        { text: '📲 פרסם בסטטוס ווטסאפ', url: shareUrl },
        { text: '📸 פתח אינסטגרם', url: `https://www.instagram.com/` }
      ]
    ];

    // 🚀 5. FINAL SEND (Professional Clean Caption & Share UI)
    await bot.telegram.sendPhoto(chatId, { source: finalResult }, {
      caption: captionText,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: shareButtons }
    });

    console.log('[Render-Worker v52.7] Success Complete with Deep-Link Buttons');
    return res.status(200).send('Render Complete');

  } catch (err: any) {
    console.error('[Render-Worker Error]:', err);
    await bot.telegram.sendMessage(chatId, `❌ **שגיאת מערכת:** ${err.message}`).catch(() => {});
    return res.status(500).send(err.message);
  }
}
