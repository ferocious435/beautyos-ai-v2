import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
import { generateSocialPost } from './_lib/graphic-engine.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { verifyQStashSignature } = await import('./_lib/security.js');
  const isAuthorized = await verifyQStashSignature(req);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized: Invalid QStash Signature' });
  }

  const { chatId, fileUrl, fileId } = req.body;
  if (!chatId || !fileUrl) return res.status(400).send('Missing chatId or fileUrl');

  console.log(`[Retouch-Worker v66.3] Starting background AI process for chat: ${chatId}`);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase missing');

    // 1. Get original photo if not in memory (though qstash passes it)
    const axios = (await import('axios')).default;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const originalBuffer = Buffer.from(response.data);

    // 2. Start Gemini Analysis & Design
    console.log(`[Retouch-Worker] Step 1: Gemini Art-Director Analysis...`);
    const aiResult = await analyzeAndGenerate(originalBuffer);

    // 3. Create AI Seed (the "Blurred Frame" context)
    console.log(`[Retouch-Worker] Step 2: Creating AI Seed (Framed)...`);
    const aiSeed = await generateSocialPost(originalBuffer, {
      format: 'AI_SEED',
      skipOverlay: true,
      theme: 'ORIGINAL_CLEAN'
    });

    // 4. Stability AI / Gemini Outpainting (NANO BANANA PRO)
    console.log(`[Retouch-Worker] Step 3: Stability AI Retouch & Expansion...`);
    const enhancedMaster = await enhanceImage(aiSeed, aiResult.imagenPrompt);

    // 5. Save to Hot-Cache (Supabase)
    const { error: upErr } = await supabase.from('bot_sessions').update({
      session_data: {
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
    // Silent fail for user, but logged in Vercel. 
    // The render-worker will notice missing cache and handle it.
    return res.status(500).send(err.message);
  }
}
