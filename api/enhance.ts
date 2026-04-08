import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { analyzeAndGenerate, enhanceImage, DesignData } from './_lib/content-engine.js';
import { generateSocialPost, SocialFormat } from './_lib/graphic-engine.js';
import { CONFIG } from './_lib/config.js';

dotenv.config();

/**
 * Unified Designer API (BeautyOS v4)
 * Принимает фото и выбранный формат -> Выдает дизайнерский результат + текст поста.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, format, businessName } = req.body;
    if (!image) throw new Error('No image provided');

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. ИИ Анализ + Контент (Universal Beauty DNA)
    const aiResult = await analyzeAndGenerate(imageBuffer as any);

    // 2. Интеллектуальная подготовка (AI Seed for v53 Outpainting)
    let finalBaseBuffer: Buffer = imageBuffer;
    try {
      console.log(`[Dashboard] Creating AI_SEED for professional outpainting...`);
      const aiSeed = await generateSocialPost(imageBuffer, {
        format: 'AI_SEED',
        skipOverlay: true, // ✅ Don't put overlays on the seed!
        businessName: businessName || 'Beauty Expert',
        theme: 'ORIGINAL_CLEAN'
      });

      console.log(`[Dashboard] ATTEMPTING IMAGE ENHANCEMENT with ${CONFIG.MODELS.ENHANCEMENT}...`);
      finalBaseBuffer = await enhanceImage(aiSeed, aiResult.imagenPrompt);
    } catch (err) {
      console.error('IMAGE ENHANCEMENT FAILED (Quota or Timeout):', err);
      // Fallback: keep original if AI fails
    }

    // 3. Маппинг формата
    let socialFormat: SocialFormat = 'INSTAGRAM_POST';
    if (format === 'WhatsApp') socialFormat = 'STORY_9_16';
    if (format === 'Facebook') socialFormat = 'SQUARE_1_1';
    if (format === 'Telegram') socialFormat = 'ORIGINAL';

    // 4. Графический дизайн (Napi-Canvas Engine)
    const designedBuffer = await generateSocialPost(finalBaseBuffer, {
      format: socialFormat,
      businessName: businessName || 'Beauty Expert',
      overlay: aiResult.overlay,
      theme: 'ORIGINAL_CLEAN' 
    });

    // 5. Результат (v34 Stability Fix)
    return res.status(200).json({
      enhancedImage: `data:image/jpeg;base64,${designedBuffer.toString('base64')}`,
      post: aiResult.post,
      cta: aiResult.cta,
      service: aiResult.detectedService,
      ai_report: `דיזיין מוכן עבור ${format}. מערכת יציבה v34.`
    });

  } catch (error: any) {
    console.error('Unified Generation Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Generation failed',
      details: error.response?.data || 'No detailed data',
      model: CONFIG.MODELS.ANALYSIS 
    });
  }
}
