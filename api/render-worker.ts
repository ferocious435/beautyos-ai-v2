import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { getSupabase } from './_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { verifyQStashSignature } = await import('./_lib/security.js');
  const isAuthorized = await verifyQStashSignature(req);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature' });
  }

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

    // 🚀 TARGET FORMAT DETERMINATION (v53.0)
    let socialFormat: any = 'SQUARE_1_1';
    let formatName = 'Facebook (1:1)';
    
    if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
    if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
    if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

    // 🎨 FINAL SOCIAL RENDER (Formatting Only)
    console.log(`[Render-Worker] Target Format: ${formatName}`);

    // 🏆 CONSISTENCY SYSTEM (v52.2): Check for cached Master-File
    if (session.session_data.enhancedMaster) {
      console.log('[Render-Worker v52.2] Cache HIT: Using existing Master-File');
      enhancedMaster = Buffer.from(session.session_data.enhancedMaster, 'base64');
    } else {
      console.log('[Render-Worker v52.2] Cache MISS: Creating new Master-File');
      const originalBuffer = Buffer.from(session.session_data.originalBuffer, 'base64');

      // 1. Create AI Seed (Framed with context for Outpainting)
      console.log('[Render-Worker] Creating AI Seed (v53.0 Framed Canvas)...');
      const aiSeed = await generateSocialPost(originalBuffer, {
        format: socialFormat, 
        skipOverlay: true, // ✅ Don't put overlays on the seed!
        theme: 'ORIGINAL_CLEAN'
      });

      // 2. AI Analysis & Multi-Modal Expansion Generation (v52.8)
      console.log('[Render-Worker] Running Gemini 3.1 Pro Outpainting Analysis...');
      const uiPromptAddon = (session.session_data.lastOverlay || []).length > 0
        ? ` IMPORTANT: This image has price/title design. Integrate it as premium studio graphics. 
           SHARPEN THE TEXT OVERLAYS.`
        : '';
      
      const expansionPrompt = `
        PRO-LEVEL BEAUTY RETOUCH & STUDIO EXPANSION (v65.1 Art-Director Edition).
        1. MASTER POLISH: Locate the subject (nails, skin, face). Perform high-end retouching, remove imperfections, even out skin tone.
        2. SEAMLESS EXPANSION: The input image is a sharp subject inside a "Blurred Frame" context (instead of black). Use these colors and textures as a guide to EXPAND the scene into a full, seamless luxury beauty studio.
        3. FLAWLESS INTEGRATION: Ensure the transition between the original photo and the new background is invisible. No visible borders or lighting shifts.
        4. LUXURY STUDIO: Include high-end studio elements (marble, soft bokeh, professional lighting accessories).
        Style: Commercial Luxury Photography, Cinematic Lighting.
        ${uiPromptAddon}
      `;

      const aiResult = await analyzeAndGenerate(aiSeed, expansionPrompt);
      imagenPrompt = aiResult.imagenPrompt;

      // 3. High-Fidelity Outpainting (NANO BANANA PRO v53)
      console.log('[Render-Worker] Running NANO BANANA PRO Outpainting on Seed...');
      enhancedMaster = await enhanceImage(aiSeed, imagenPrompt);

      // 4. Persistence
      await supabase.from('bot_sessions').update({
        session_data: {
          ...session.session_data,
          enhancedMaster: enhancedMaster.toString('base64'),
          lastImagenPrompt: imagenPrompt,
          lastPost: aiResult.post,
          lastDesign: aiResult.design,
          lastStyle: aiResult.style
        }
      }).eq('user_id', chatId);
      
      session.session_data.lastPost = aiResult.post;
      session.session_data.lastDesign = aiResult.design;
      session.session_data.lastStyle = aiResult.style;
    }

    // 🎨 FINAL RENDER (POST-PROCESS DESIGN - v60 Art-Director Edition)
    const activeDesign = session.session_data.lastDesign || {};
    const activeStyle = session.session_data.lastStyle || { preset: 'GLASSMorphism', primaryColor: '#FFFFFF' };
    
    // 🏢 DYNAMIC BRANDING (v63.1)
    const { data: userData } = await supabase.from('users')
      .select('business_name')
      .eq('telegram_id', Number(chatId))
      .single();
    const realBusinessName = userData?.business_name || 'Beauty Expert';

    // 🚀 PRO COMPOSITION ENGINE v63.1 (Adaptive Safe Zones)
    const rawOverlays = session.session_data.lastOverlay || [];
    
    // Grouping strategy: Combine lines of the same type into one multiline box
    const groupedMap = new Map<string, any>();
    rawOverlays.forEach((line: any) => {
      const cleanText = (line.text || '').replace(/[✨\*]/g, '').trim();
      if (!cleanText) return;
      
      if (groupedMap.has(line.type)) {
        groupedMap.get(line.type).text += '\n' + cleanText;
      } else {
        groupedMap.set(line.type, { ...line, text: cleanText });
      }
    });

    // 🚀 PERFECT STACKING v61 (Collision-Weighted Composition)
    const usedPositions: { x: number, y: number, h: number }[] = [];
    const overlays = Array.from(groupedMap.values()).map((line: any) => {
      const design = activeDesign[line.type];
      
      // 📐 ADAPTIVE SAFE ZONES (v61/v65.1)
      let x = design?.x ?? (line.type === 'PRICE' ? 0.9 : (line.type === 'LOGO' ? 0.05 : 0.5));
      let y = design?.y;
      let align: 'left' | 'center' | 'right' = design?.align ?? (line.type === 'PRICE' ? 'right' : (line.type === 'LOGO' ? 'left' : 'center'));

      // Default Y-Slots for v61
      if (y === undefined) {
        if (line.type === 'TITLE') y = 0.12;
        else if (line.type === 'PRICE') y = 0.18; // Stagger price below title by default
        else if (line.type === 'PROMO') y = 0.82;
        else if (line.type === 'LOGO') { y = 0.94; x = 0.05; align = 'left'; }
        else y = 0.88;
      }

      // 🛑 PRECISION COLLISION AVOIDANCE (v61)
      const step = 0.12; 
      const thresholdY = 0.10; // Tighter vertical packing
      let attempts = 0;
      
      while (usedPositions.some(p => Math.abs(p.y - y!) < thresholdY && Math.abs(p.x - x) < 0.4) && attempts < 5) {
        // Intelligent Push: Push Title/Price UP, Push Promo/Logo DOWN
        if (y! < 0.4) y! -= step; 
        else y! += step;
        attempts++;
      }
      
      // Safe bounds (v61 Hard-Limit)
      y = Math.max(0.06, Math.min(0.94, y!));
      
      usedPositions.push({ x, y, h: step });

      // 🎨 LUXURY STYLE
      let fontSize = line.fontSize || 60;
      if (line.type === 'PROMO') fontSize = 72;
      if (line.type === 'LOGO') fontSize = 36;

      return { 
        ...line, 
        fontSize,
        xPosition: x, 
        yPosition: y, 
        textAlign: align,
        rotation: (line.type === 'PRICE' ? -3 : (line.type === 'PROMO' ? 2 : 0))
      };
    });

    const finalResult = await generateSocialPost(enhancedMaster, {
      format: socialFormat,
      businessName: realBusinessName,
      overlay: overlays, 
      style: activeStyle,
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
