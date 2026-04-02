import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import type { OverlayLine } from './content-engine.js';

export type SocialFormat = 'INSTAGRAM_POST' | 'STORY_9_16' | 'SQUARE_1_1' | 'ORIGINAL';

export interface RenderOptions {
  format: SocialFormat;
  businessName?: string;
  overlay?: OverlayLine[];
  theme?: 'LUXURY_BLACK' | 'ORIGINAL_CLEAN' | 'WATERMARK';
  isEnhanced?: boolean;
}

// --- FONT SYSTEM v34 (Reliability Mode) ---
let fontsRegistered = false;

function ensureFonts() {
  // 🧹 Cleaned up: Corrupted font files removed. 
  // Using native system font stack for maximum reliability in Vercel.
  if (fontsRegistered) return;
  fontsRegistered = true;
  console.log('[GraphicEngine] Using System Font Stack (Reliability Mode)');
}

/**
 * Premium Beauty Graphic Engine
 * Optimization: Heebo rendering, smart shadows, high contrast
 */
export async function generateSocialPost(
  imageBuffer: Buffer,
  options: RenderOptions
): Promise<Buffer> {
  ensureFonts();
  
  const { format, businessName = 'BeautyOS', overlay = [], theme = 'ORIGINAL_CLEAN' } = options;

  const targetWidth = 1080;
  let targetHeight = 1080;
  if (format === 'STORY_9_16') targetHeight = 1920;
  else if (format === 'INSTAGRAM_POST') targetHeight = 1350;

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  // 1. Фото (Smart Scaling Fix v37)
  const image = await loadImage(imageBuffer);
  
  // Если картинка слишком маленькая и НЕ ретуширована, мы не растягиваем её на весь холст (чтобы не было мыла)
  const isTooSmall = image.width < 600 || image.height < 600;
  const shouldStretch = options.isEnhanced || !isTooSmall;

  const imgAspect = image.width / image.height;
  const canvasAspect = targetWidth / targetHeight;

  let sx = 0, sy = 0, sw = image.width, sh = image.height;
  
  if (shouldStretch) {
    if (imgAspect > canvasAspect) {
      sw = image.height * canvasAspect;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / canvasAspect;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  } else {
    // Режим "Без мыла": Центрируем оригинал на черном фоне или используем его как есть
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    const drawW = Math.min(image.width, targetWidth);
    const drawH = drawW / imgAspect;
    ctx.drawImage(image, (targetWidth - drawW) / 2, (targetHeight - drawH) / 2, drawW, drawH);
  }

  // 2. Универсальный градиент (Luxury Contrast)
  const gradH = targetHeight * 0.5;
  const grad = ctx.createLinearGradient(0, targetHeight - gradH, 0, targetHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, targetHeight - gradH, targetWidth, gradH);

  // 3. Текст
  if (overlay && overlay.length > 0) {
    ctx.textAlign = 'center';
    ctx.direction = 'rtl'; // Hebrew support

    for (const line of overlay) {
      const cleanText = (line.text || '').trim();
      if (!cleanText) continue;

      const y = (line.yPosition || 0.8) * targetHeight;
      const fontSize = Math.round((line.fontSize || 56) * (targetWidth / 1080));
      
      // Global Font Stack (Multi-language support)
      const fontName = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Hebrew", sans-serif';
      ctx.font = `bold ${fontSize}px ${fontName}`;
      
      const metrics = ctx.measureText(cleanText);
      console.log(`[GraphicEngine] Line: "${cleanText}", Width: ${metrics.width}, Font: ${ctx.font}`);

      // Highlight Box
      if (line.highlightColor && line.highlightColor !== 'null' && metrics.width > 5) {
        const padX = 30;
        const padY = 15;
        const boxW = metrics.width + padX * 2;
        const boxH = fontSize + padY * 2;
        const boxX = (targetWidth / 2) - (boxW / 2);
        const boxY = y - fontSize - padY + (fontSize * 0.15); // Adjust for Heebo baseline
        const radius = 15;

        ctx.fillStyle = line.highlightColor;
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxW - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        ctx.lineTo(boxX + boxW, boxY + boxH - radius);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        ctx.lineTo(boxX + radius, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Тень текста для глубины
      if (theme === 'WATERMARK') {
        ctx.globalAlpha = 0.6; // Opacity for watermark
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
      }
      
      ctx.fillStyle = line.color || '#FFFFFF';
      ctx.fillText(cleanText, targetWidth / 2, y);
      
      // Reset
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  // 4. Branding
  if (businessName) {
    const fontStack = 'system-ui, sans-serif';
    ctx.font = `24px ${fontStack}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    
    // Subtle shadow for branding
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(businessName, targetWidth / 2, targetHeight - 40);
    ctx.shadowBlur = 0;
  }

  const buffer = canvas.toBuffer('image/jpeg');
  return Buffer.from(buffer);
}
