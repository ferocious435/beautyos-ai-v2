import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { analyzeAndGenerate, enhanceImage } from './lib/content-engine.js';
import { generateSocialPost, SocialFormat } from './lib/graphic-engine.js';

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

    // 2. Интеллектуальное решение по фону
    let finalBaseBuffer: Buffer = imageBuffer;
    if (aiResult.backgroundAction === 'replace') {
      console.log('REPLACING BACKGROUND...');
      finalBaseBuffer = await enhanceImage(imageBuffer, aiResult.imagenPrompt);
    }

    // 3. Маппинг формата
    let jimpFormat: SocialFormat = 'INSTAGRAM_POST';
    if (format === 'WhatsApp') jimpFormat = 'STORY_9_16';
    if (format === 'Facebook') jimpFormat = 'SQUARE_1_1';
    if (format === 'Telegram') jimpFormat = 'ORIGINAL';

    // 4. Графический дизайн (Jimp Engine)
    const designedBuffer = await generateSocialPost(finalBaseBuffer, {
      format: jimpFormat,
      businessName: businessName || 'Beauty Expert',
      title: aiResult.overlayTitle,
      subtitle: aiResult.overlaySubtitle,
      theme: 'LUXURY_BLACK' 
    });

    // 5. Результат
    return res.status(200).json({
      enhancedImage: `data:image/jpeg;base64,${designedBuffer.toString('base64')}`,
      post: aiResult.post,
      cta: aiResult.cta,
      service: aiResult.detectedService,
      ai_report: `Дизайн готов для ${format}. Использован Lux-шаблон.`
    });

  } catch (error: any) {
    console.error('Unified Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
}
