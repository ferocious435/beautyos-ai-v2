import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import { processor } from './_lib/processor.js';
import { SocialFormat } from './_lib/graphic-engine.js';

dotenv.config();

/**
 * Unified Designer API (BeautyOS v2.1)
 * Теперь использует UnifiedProcessor для полной совместимости с Ботом.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, format, businessName } = req.body;
    if (!image) throw new Error('No image provided');

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 1. Маппинг формата
    let socialFormat: SocialFormat = 'INSTAGRAM_POST';
    if (format === 'WhatsApp') socialFormat = 'STORY_9_16';
    if (format === 'Facebook') socialFormat = 'SQUARE_1_1';
    if (format === 'Telegram') socialFormat = 'ORIGINAL';

    // 2. Вызов Единого Процессора (Анализ + Ретушь + Рендер)
    console.log(`[Dashboard API] Processing request via UnifiedProcessor for ${format}...`);
    const result = await processor.fullProcess(imageBuffer, socialFormat, businessName);

    // 3. Результат
    return res.status(200).json({
      enhancedImage: `data:image/jpeg;base64,${result.image.toString('base64')}`,
      post: result.design.post,
      cta: result.design.cta,
      service: result.design.detectedService,
      ai_report: `דיזיין מוכן עבור ${format} (Unified Processor v1).`
    });

  } catch (error: any) {
    console.error('Unified Generation Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Generation failed',
      details: error.response?.data || 'Check logs'
    });
  }
}

  } catch (error: any) {
    console.error('Unified Generation Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Generation failed',
      details: error.response?.data || 'No detailed data',
      model: CONFIG.MODELS.ANALYSIS 
    });
  }
}
