import { Jimp, loadFont } from 'jimp';
import { getVisualBidiText } from './graphic-utils';

export type SocialFormat = 'INSTAGRAM_POST' | 'STORY_9_16' | 'SQUARE_1_1' | 'ORIGINAL';

export interface RenderOptions {
  format: SocialFormat;
  businessName?: string;
  title?: string;
  subtitle?: string;
  theme?: 'LUXURY_BLACK' | 'ORIGINAL_CLEAN';
}

/**
 * BeautyOS Graphic Engine v4 (Jimp 1.6.0 Adaptive)
 * Создает дизайнерские изображения для социальных сетей на основе ИИ-аналитики.
 */
export async function generateSocialPost(
  imageBuffer: Buffer,
  options: RenderOptions
): Promise<Buffer> {
  const { format, businessName = 'BeautyOS Expert', title, subtitle, theme = 'LUXURY_BLACK' } = options;

  // 1. Загрузка изображения
  const image = await Jimp.read(imageBuffer);
  
  // 2. Определение размеров по формату
  let targetWidth = 1080;
  let targetHeight = 1080;

  if (format === 'STORY_9_16') {
    targetHeight = 1920;
  } else if (format === 'INSTAGRAM_POST') {
    targetHeight = 1350; // 4:5
  }

  // Создаем холст
  const canvas = new Jimp({ 
    width: targetWidth, 
    height: targetHeight, 
    color: theme === 'LUXURY_BLACK' ? 0x050508FF : 0xFFFFFFFF 
  });

  // 3. Кадрирование
  if (theme === 'LUXURY_BLACK') {
    image.cover({ w: targetWidth, h: targetWidth }); 
    canvas.composite(image, 0, (targetHeight - targetWidth) / 2);
  } else {
    image.cover({ w: targetWidth, h: targetHeight });
    canvas.composite(image, 0, 0);
  }

  // 4. Текст
  try {
    // Используем встроенные шрифты (теперь через loadFont из корня пакета)
    const fontTitle = await loadFont('https://unpkg.com/@jimp/plugin-print/fonts/open-sans/open-sans-64-white/open-sans-64-white.fnt' as any);
    const fontSmall = await loadFont('https://unpkg.com/@jimp/plugin-print/fonts/open-sans/open-sans-16-white/open-sans-16-white.fnt' as any);

    if (title) {
      canvas.print({
        font: fontTitle,
        x: 0,
        y: format === 'STORY_9_16' ? 200 : 80,
        text: {
          text: getVisualBidiText(title),
          alignmentX: 2 // Center (в v1.6.0 2 = Center)
        },
        maxWidth: targetWidth
      });
    }

    if (businessName) {
      canvas.print({
        font: fontSmall,
        x: 0,
        y: targetHeight - 100,
        text: {
          text: getVisualBidiText(businessName),
          alignmentX: 2 // Center
        },
        maxWidth: targetWidth
      });
    }
  } catch (err) {
    console.error('FONT LOAD ERROR:', err);
  }

  const buffer = await canvas.getBuffer('image/jpeg');
  return Buffer.from(buffer);
}
