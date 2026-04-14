import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './_lib/supabase.js';
import { processor } from './_lib/processor.js';

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

  console.log(`[Retouch-Worker v2.1] Starting AI process via UnifiedProcessor for chat: ${chatId}`);

  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase missing');

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const originalBuffer = Buffer.from(response.data);

    // 1. Анализ (Gemini 1.5 Pro)
    const aiResult = await processor.analyze(originalBuffer);

    // 2. Создание сида (Canvas)
    const seed = await processor.createSeed(originalBuffer);

    // 3. Ретушь (Gemini 2.0 Flash)
    let finalMasterBuffer = originalBuffer;
    let enhancementSucceeded = false;
    try {
      finalMasterBuffer = await processor.enhance(seed, aiResult.imagenPrompt);
      enhancementSucceeded = true;
    } catch (err: any) {
      console.error(`[Retouch-Worker] ❌ Enhancement failed: ${err.message}. Fallback to original.`);
    }

    // 4. Сохранение результатов в Supabase (Stateless Session)
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
