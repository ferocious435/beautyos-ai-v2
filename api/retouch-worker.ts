import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { generateSocialPost } from './_lib/graphic-engine.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Use a simple shared secret instead of QStash signature which fails on parsed bodies natively
  const internalSecret = req.headers['x-internal-secret'];
  if (internalSecret !== process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { chatId, fileUrl, fileId } = req.body;
  if (!chatId || !fileUrl) return res.status(400).send('Missing chatId or fileUrl');

  console.log(`[Retouch-Worker v66.4] Starting background AI process for chat: ${chatId}`);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase missing');

    const axios = (await import('axios')).default;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const originalBuffer = Buffer.from(response.data);

    // AI Pipeline
    console.log(`[Retouch-Worker] Step 1: Gemini Art-Director Analysis...`);
    const aiResult = await analyzeAndGenerate(originalBuffer);

    console.log(`[Retouch-Worker] Step 2: Creating AI Seed (Framed)...`);
    const aiSeed = await generateSocialPost(originalBuffer, {
      format: 'AI_SEED',
      skipOverlay: true,
      theme: 'ORIGINAL_CLEAN'
    });

    console.log(`[Retouch-Worker] Step 3: Stability AI Retouch & Expansion...`);
    const enhancedMaster = await enhanceImage(aiSeed, aiResult.imagenPrompt);

    // Carefully merge with existing session so we don't wipe out overlays added during wait
    const { data: currentSession } = await supabase.from('bot_sessions').select('session_data').eq('user_id', chatId).single();
    const existingData = currentSession?.session_data || {};

    const { error: upErr } = await supabase.from('bot_sessions').update({
      session_data: {
        ...existingData,
        originalBuffer: originalBuffer.toString('base64'),
        enhancedMaster: enhancedMaster.toString('base64'),
        lastImageId: fileId,
        lastImagenPrompt: aiResult.imagenPrompt,
        lastPost: aiResult.post,
        lastDesign: aiResult.design,
        lastStyle: aiResult.style,
        status: 'ready_to_design' 
      }
    }).eq('user_id', chatId);

    if (upErr) throw upErr;

    console.log(`[Retouch-Worker] ✅ SUCCESS: AI Master-File cached for chat: ${chatId}`);
    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error('[Retouch-Worker CRITICAL]:', err);
    return res.status(500).send(err.message);
  }
}
