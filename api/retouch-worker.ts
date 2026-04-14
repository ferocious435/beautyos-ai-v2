import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { analyzeAndGenerate, enhanceImage } from './_lib/content-engine.js';
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
  
  // Also allow via internal secret for manual testing
  const internalSecret = req.headers['x-internal-secret'];
  const isSecretValid = internalSecret === process.env.TELEGRAM_BOT_TOKEN;

  if (!isAuthorized && !isSecretValid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { chatId, fileUrl, fileId } = req.body;
  if (!chatId || !fileUrl) return res.status(400).send('Missing chatId or fileUrl');

  console.log(`[Retouch-Worker v67.1] Starting background AI process for chat: ${chatId}`);

  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase missing');

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const originalBuffer = Buffer.from(response.data);

    // Step 1: Gemini Art-Director Analysis
    console.log(`[Retouch-Worker] Step 1: Gemini Art-Director Analysis...`);
    let aiResult;
    try {
      aiResult = await analyzeAndGenerate(originalBuffer);
      console.log(`[Retouch-Worker] Step 1 ✅ Analysis complete. Service: ${aiResult.detectedService}`);
    } catch (err: any) {
      console.error(`[Retouch-Worker] Step 1 ❌ Analysis failed:`, err.message);
      // Fallback: save original with default metadata so render-worker can still work
      aiResult = {
        post: 'Professional Beauty Service ✨',
        imagenPrompt: 'Professional beauty retouch',
        design: {},
        style: { preset: 'LUXURY_GOLD', primaryColor: '#FFFFFF', secondaryColor: '#000000', shadowOpacity: 0.7, boxOpacity: 0.3 },
        detectedService: 'Beauty Professional'
      };
    }

    // Step 2: AI Seed + Enhancement (with graceful fallback)
    let finalMasterBuffer: Buffer = originalBuffer; // Default fallback = original
    let enhancementSucceeded = false;

    try {
      console.log(`[Retouch-Worker] Step 2: Creating AI Seed (Framed)...`);
      const aiSeed = await generateSocialPost(originalBuffer, {
        format: 'AI_SEED',
        skipOverlay: true,
        theme: 'ORIGINAL_CLEAN'
      });

      console.log(`[Retouch-Worker] Step 3: Gemini Enhancement & Expansion...`);
      finalMasterBuffer = await enhanceImage(aiSeed, aiResult.imagenPrompt);
      enhancementSucceeded = true;
      console.log(`[Retouch-Worker] Step 3 ✅ Enhancement complete!`);
    } catch (err: any) {
      console.error(`[Retouch-Worker] Step 2-3 ❌ Enhancement failed: ${err.message}. Using original image.`);
      // finalMasterBuffer stays as originalBuffer — user still gets a design, just without AI enhancement
    }

    // Step 4: Save to Supabase (ALWAYS — even if enhancement failed)
    const { data: currentSession } = await supabase
      .from('bot_sessions')
      .select('session_data')
      .eq('user_id', chatId)
      .single();
    
    const existingData = currentSession?.session_data || {};

    const { error: upErr } = await supabase.from('bot_sessions').update({
      session_data: {
        ...existingData,
        originalBuffer: originalBuffer.toString('base64'),
        enhancedMaster: finalMasterBuffer.toString('base64'),
        lastImageId: fileId,
        lastImagenPrompt: aiResult.imagenPrompt,
        lastPost: aiResult.post,
        lastDesign: aiResult.design,
        lastStyle: aiResult.style,
        status: 'ready_to_design' 
      }
    }).eq('user_id', chatId);

    if (upErr) throw upErr;

    console.log(`[Retouch-Worker] ✅ SUCCESS (enhanced=${enhancementSucceeded}): AI Master-File cached for chat: ${chatId}`);
    return res.status(200).json({ success: true, enhanced: enhancementSucceeded });

  } catch (err: any) {
    console.error('[Retouch-Worker CRITICAL]:', err);
    
    // LAST RESORT: Even on critical failure, try to save original so render-worker doesn't hang
    try {
      const { data: session } = await supabase.from('bot_sessions').select('session_data').eq('user_id', chatId).single();
      if (session?.session_data?.originalBuffer && !session?.session_data?.enhancedMaster) {
        await supabase.from('bot_sessions').update({
          session_data: {
            ...session.session_data,
            enhancedMaster: session.session_data.originalBuffer, // Use original as fallback
            status: 'ready_to_design'
          }
        }).eq('user_id', chatId);
        console.log('[Retouch-Worker] Fallback: saved original as enhancedMaster');
      }
    } catch { /* ignore fallback errors */ }
    
    return res.status(500).send(err.message);
  }
}
