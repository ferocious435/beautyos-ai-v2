import { analyzeAndGenerate, enhanceImage, DesignData } from './content-engine.js';
import { generateSocialPost, SocialFormat } from './graphic-engine.js';
import { CONFIG } from './config.js';

/**
 * UnifiedProcessor (v1.1)
 * Единый мозг системы BeautyOS AI v2.
 * Оживляет концепцию "One logic for all entry points".
 */
export class UnifiedProcessor {
  /**
   * Стейкинг v62: Интеллектуальное позиционирование (Collision-Free)
   */
  calculateOverlays(rawOverlays: any[]): any[] {
    const groupedMap = new Map<string, any>();
    rawOverlays.forEach((line: any) => {
      const cleanText = (line.text || '').replace(/[✨*]/g, '').trim();
      if (!cleanText) return;
      if (groupedMap.has(line.type)) groupedMap.get(line.type).text += '\n' + cleanText;
      else groupedMap.set(line.type, { ...line, text: cleanText });
    });

    const usedBoxes: { x: number, y: number, w: number, h: number }[] = [];
    const margin = 0.04;

    return Array.from(groupedMap.values()).map((line: any) => {
      let x = line.xPosition || (line.type === 'PRICE' ? 0.9 : (line.type === 'LOGO' ? 0.05 : 0.5));
      let y = line.yPosition;
      let align: any = line.textAlign || (line.type === 'PRICE' ? 'right' : (line.type === 'LOGO' ? 'left' : 'center'));

      if (y === undefined) {
        if (line.type === 'TITLE') y = 0.12;
        else if (line.type === 'PRICE') y = 0.22;
        else if (line.type === 'PROMO') y = 0.82;
        else if (line.type === 'LOGO') y = 0.94;
        else y = 0.5;
      }

      const fontSize = (line.fontSize || 60) / 1080;
      const lineCount = line.text.split('\n').length;
      const blockHeight = lineCount * fontSize * 1.35;

      const isColliding = (newY: number, newH: number) => {
        return usedBoxes.some(b => {
          const top1 = newY - newH / 2;
          const bot1 = newY + newH / 2;
          const top2 = b.y - b.h / 2;
          const bot2 = b.y + b.h / 2;
          return (top1 < bot2 + margin && bot1 > top2 - margin);
        });
      };

      let attempts = 0;
      while (isColliding(y, blockHeight) && attempts < 10) {
        if (y < 0.4) y += 0.08; else y -= 0.08;
        attempts++;
      }
      y = Math.max(0.08, Math.min(0.92, y));
      usedBoxes.push({ x, y, w: 0.8, h: blockHeight });

      return { 
        ...line, 
        xPosition: x, 
        yPosition: y, 
        textAlign: align,
        rotation: (line.rotation !== undefined ? line.rotation : (line.type === 'PRICE' ? -2 : (line.type === 'PROMO' ? 1.5 : (Math.random() * 1.6 - 0.8))))
      };
    });
  }

  /**
   * Шаг 1: Глубокий анализ ИИ (Gemini 3.1)
   */
  async analyze(imageBuffer: Buffer, businessName?: string): Promise<DesignData> {
    console.log('[Processor] Step 1: Analyzing image...');
    return await analyzeAndGenerate(imageBuffer, `Premium beauty marketing for ${businessName || 'Beauty Expert'}`);
  }

  /**
   * Шаг 2: Создание AI_SEED для правильного outpainting
   */
  async createSeed(imageBuffer: Buffer, businessName?: string): Promise<Buffer> {
    console.log('[Processor] Step 2: Creating AI_SEED...');
    return await generateSocialPost(imageBuffer, {
      format: 'AI_SEED',
      skipOverlay: true,
      businessName: businessName || 'Beauty Expert',
      theme: 'ORIGINAL_CLEAN'
    });
  }

  /**
   * Шаг 3: Ретушь и расширение (Imagen 4.0)
   */
  async enhance(seedBuffer: Buffer, prompt: string): Promise<Buffer> {
    console.log('[Processor] Step 3: Enhancing/Retouching...');
    return await enhanceImage(seedBuffer, prompt);
  }

  /**
   * Шаг 4: Финальный графический рендеринг (Staking v62 Aware)
   */
  async render(
    imageBuffer: Buffer, 
    format: SocialFormat, 
    design: DesignData, 
    businessName?: string
  ): Promise<Buffer> {
    console.log(`[Processor] Step 4: Rendering final ${format} post...`);
    
    // Интеллектуальный расчет позиций
    const finalOverlays = this.calculateOverlays(design.overlay || []);
    const hasLogo = finalOverlays.some(l => l.type === 'LOGO');

    return await generateSocialPost(imageBuffer, {
      format: format,
      businessName: businessName || 'Beauty Expert',
      overlay: finalOverlays,
      style: design.style as any,
      theme: 'ORIGINAL_CLEAN',
      skipWatermark: hasLogo
    });
  }

  /**
   * Полный синхронный цикл (для Dashboard)
   */
  async fullProcess(
    imageBuffer: Buffer, 
    format: SocialFormat, 
    businessName?: string
  ) {
    // 1. Анализ
    const design = await this.analyze(imageBuffer, businessName);
    
    // 2. Сид
    const seed = await this.createSeed(imageBuffer, businessName);
    
    // 3. Ретушь (с обработкой таймаутов)
    let enhanced = seed;
    try {
      enhanced = await this.enhance(seed, design.imagenPrompt);
    } catch (err) {
      console.warn('[Processor] Enhancement failed, falling back to seed:', (err as any).message);
    }

    // 4. Рендер
    const final = await this.render(enhanced, format, design, businessName);

    return {
      image: final,
      design: design
    };
  }
}

export const processor = new UnifiedProcessor();
