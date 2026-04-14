

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { wrapText, getVisualBidiText } from './graphic-utils.js';
import type { OverlayLine } from './content-engine.js';

export type SocialFormat = 'INSTAGRAM_POST' | 'STORY_9_16' | 'SQUARE_1_1' | 'ORIGINAL' | 'AI_SEED';

export interface StyleOptions {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  shadowOpacity: number;
  boxOpacity: number;
  isMultiLine?: boolean;
  borderColor?: string;
}

export interface RenderOptions {
  format: SocialFormat;
  businessName?: string;
  overlay?: OverlayLine[];
  theme?: 'LUXURY_BLACK' | 'ORIGINAL_CLEAN' | 'WATERMARK';
  isEnhanced?: boolean;
  skipOverlay?: boolean;
  skipWatermark?: boolean; // New in v2.3
  style?: StyleOptions; 
}

// --- FONT SYSTEM v68.0 (Final Production Edition) ---
const SANS_STACK = 'Assistant, "Noto Color Emoji", sans-serif';
const SERIF_STACK = 'Assistant, "Playfair Display", "Noto Color Emoji", serif';
const EMOJI_STACK = '"Noto Color Emoji", sans-serif';

const RTL_CHAR = /[\u0590-\u05FF\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const fontsDir = path.join(__dirname, '..', '_assets', 'fonts');
    
    const fontsToRegister = [
      { name: 'Assistant', file: 'Assistant-Bold.ttf' },
      { name: 'Playfair Display', file: 'PlayfairDisplay-Bold.ttf' },
      { name: 'Noto Color Emoji', file: 'NotoColorEmoji.ttf' }
    ];

    for (const font of fontsToRegister) {
      const fullPath = path.join(fontsDir, font.file);
      if (fs.existsSync(fullPath)) {
        GlobalFonts.registerFromPath(fullPath, font.name);
        console.log(`[GraphicEngine] Registered: ${font.name}`);
      } else {
        console.warn(`[GraphicEngine] Font missing: ${font.file}`);
      }
    }
  } catch (err) {
    console.error('[GraphicEngine] Font registration failed:', err);
  }
  fontsRegistered = true;
}

/**
 * Marketing Art-Director Graphic Engine v67.0
 * - Blurred backdrop (no more black squares)
 * - Luxury typography (Playfair Display serif for titles)
 * - Semi-transparent logo watermark
 * - BiDi-safe Hebrew rendering
 */
export async function generateSocialPost(
  imageBuffer: Buffer,
  options: RenderOptions
): Promise<Buffer> {
  ensureFonts();
  
  const { format, businessName = 'Beauty Expert' } = options;

  const targetWidth = 1080;
  let targetHeight = 1080;
  if (format === 'STORY_9_16') targetHeight = 1920;
  else if (format === 'INSTAGRAM_POST') targetHeight = 1350;
  else if (format === 'AI_SEED') {
    // v62.3: AI_SEED must match the target social format to avoid black borders
    if (options.theme === 'LUXURY_BLACK') targetHeight = 1920; // Fallback to Story
    else if (options.theme === 'ORIGINAL_CLEAN') targetHeight = 1350; // Fallback to Post
    // Default to the provided options if possible or standard Post
    targetHeight = targetHeight || 1350;
  }

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  const image = await loadImage(imageBuffer);
  
  if (format === 'ORIGINAL') {
    const originalCanvas = createCanvas(image.width, image.height);
    const octx = originalCanvas.getContext('2d');
    octx.drawImage(image, 0, 0);
    renderOverlay(octx, image.width, image.height, options);
    return Buffer.from(originalCanvas.toBuffer('image/jpeg'));
  }

  // --- BACKGROUND ENGINE v67.0 ---
  // Always use blurred image backdrop to eliminate black squares at edges
  const bgAspect = image.width / image.height;
  const bgCaspect = targetWidth / targetHeight;
  let bgW: number, bgH: number, bgX: number, bgY: number;

  // Cover-fill: image always covers entire canvas
  if (bgAspect > bgCaspect) {
    bgH = targetHeight; bgW = targetHeight * bgAspect; bgX = (targetWidth - bgW) / 2; bgY = 0;
  } else {
    bgW = targetWidth; bgH = targetWidth / bgAspect; bgX = 0; bgY = (targetHeight - bgH) / 2;
  }

  ctx.save();
  ctx.drawImage(image, bgX, bgY, bgW, bgH);
  // Darken
  if (format === 'AI_SEED') {
    // 🔥 FIX: NO DARK BLUR for AI_SEED. It creates black artifacts in Imagen.
    // Use a neutral luxury solid color that AI can easily replace.
    ctx.fillStyle = '#1A1A1A'; // Sleek Studio Black
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    try {
      // @ts-expect-error - setting custom filter
      ctx.filter = 'blur(50px)';
      ctx.drawImage(canvas, 0, 0);
    } catch {
      // Fallback: additional darkening if filter not supported
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
  }
  ctx.restore();

  // --- DRAW MAIN IMAGE ---
  const imgAspect = image.width / image.height;
  const canvasAspect = targetWidth / targetHeight;

  // Dynamic Composition Engine v67.0 (Safe Zones & Auto-Scaling)
  const paddingX = targetWidth * 0.05;
  const paddingY = targetHeight * 0.06;
  const safeZone = {
    left: paddingX,
    right: targetWidth - paddingX,
    top: paddingY,
    bottom: targetHeight - paddingY,
    width: targetWidth - (paddingX * 2),
    height: targetHeight - (paddingY * 2)
  };

  ctx.save();
  
  let dx: number, dy: number, dw: number, dh: number;
  if (format === 'AI_SEED') {
    // Framed Seed Logic (v66.2) — subject centered with frame
    const scale = 0.9;
    const innerW = targetWidth * scale;
    const innerH = targetHeight * scale;
    
    if (imgAspect > (innerW / innerH)) {
      dw = innerW;
      dh = innerW / imgAspect;
    } else {
      dh = innerH;
      dw = innerH * imgAspect;
    }
    dx = (targetWidth - dw) / 2;
    dy = (targetHeight - dh) / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
  } else {
    // Normal centered fit
    if (imgAspect > canvasAspect) {
      dw = targetWidth; dh = targetWidth / imgAspect; dx = 0; dy = (targetHeight - dh) / 2;
    } else {
      dh = targetHeight; dw = targetHeight * imgAspect; dx = (targetWidth - dw) / 2; dy = 0;
    }
  }

  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  // Overlay
  if (format !== 'AI_SEED' && !options.skipOverlay) {
    renderOverlay(ctx, targetWidth, targetHeight, { ...options, safeZone });
  }

  // Branding (v67.1 Luxury Serif Watermark)
  if (businessName && format !== 'AI_SEED' && !options.skipWatermark) {
    ctx.save();
    ctx.font = `italic 26px ${SERIF_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.direction = RTL_CHAR.test(businessName) ? 'rtl' : 'ltr';
    ctx.fillText(businessName, targetWidth / 2, targetHeight - 38);
    ctx.restore();
  }

  return Buffer.from(canvas.toBuffer('image/jpeg'));
}

function renderOverlay(ctx: any, targetWidth: number, targetHeight: number, options: RenderOptions & { safeZone?: any }) {
  const { overlay = [], style, safeZone } = options;
  
  // v67.0: ALWAYS luxury — this is a premium beauty platform
  const isLuxury = true;
  
  // Cinematic Darkener (Bottom gradient for text readability)
  const gradH = targetHeight * 0.45;
  const grad = ctx.createLinearGradient(0, targetHeight - gradH, 0, targetHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, targetHeight - gradH, targetWidth, gradH);

  if (overlay && overlay.length > 0) {
    // BiDi: text is pre-reordered to visual order in getVisualBidiText()
    // Do NOT set ctx.direction = 'rtl' — it would cause double-reversal

    for (const line of overlay) {
      const cleanText = (line.text || '').trim();
      if (!cleanText) continue;

      // --- CINEMATIC VIGNETTE (v65.1 READABILITY) ---
      // Top Darkener for TITLE (Conditional)
      if (line.type === 'TITLE' || (line.yPosition && line.yPosition < 0.3)) {
        const topGradH = targetHeight * 0.25;
        const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, targetWidth, topGradH);
      }

      // 💎 LUXURY LOGO v67.0 (Transparent Elegant Watermark)
      if (line.type === 'LOGO') {
        ctx.save();
        const logoSize = Math.round(42 * (targetWidth / 1080));
        ctx.font = `italic ${logoSize}px ${SERIF_STACK}, ${EMOJI_STACK}`;
        ctx.globalAlpha = 0.55; // Semi-transparent luxury watermark
        ctx.fillStyle = '#FFFFFF'; 
        ctx.shadowColor = 'rgba(255, 255, 255, 0.15)'; ctx.shadowBlur = 12; // Soft warm glow
        ctx.direction = RTL_CHAR.test(cleanText) ? 'rtl' : 'ltr';
        ctx.textAlign = line.textAlign || (ctx.direction === 'rtl' ? 'right' : 'left');
        
        let lx = line.xPosition !== undefined ? line.xPosition * targetWidth : (ctx.direction === 'rtl' ? targetWidth - 60 : 60);
        let ly = line.yPosition !== undefined ? line.yPosition * targetHeight : targetHeight - 180;
        
        ctx.fillText(cleanText, lx, ly);
        ctx.globalAlpha = 1.0;
        ctx.restore();
        continue;
      }

      const isRtl = RTL_CHAR.test(cleanText);
      const activeFont = isRtl ? 'Assistant' : (line.type === 'TITLE' ? 'Playfair Display' : 'Assistant');
      
      const effSize = Math.round((line.fontSize || 60) * (targetWidth / 1080));
      ctx.font = `${effSize}px ${activeFont}, "Noto Color Emoji"`;
      
      const maxWidth = safeZone ? safeZone.width : targetWidth * 0.9;
      let lines = wrapText(ctx, cleanText, maxWidth);
      let effSizeFit = effSize;
      const maxBlockH = targetHeight * 0.25;
      
      while (lines.length * (effSizeFit * 1.3) > maxBlockH && effSizeFit > 24) {
        effSizeFit -= 4;
        ctx.font = `${effSizeFit}px ${activeFont}, "Noto Color Emoji"`;
        lines = wrapText(ctx, cleanText, maxWidth);
      }

      const lineHeight = effSizeFit * 1.3;
      let xPos = line.xPosition !== undefined ? line.xPosition * targetWidth : targetWidth / 2;
      let yPos = (line.yPosition || 0.8) * targetHeight;

      ctx.save();
      // Luxury warm shadow system v70.0 (Final)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'; 
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = line.type === 'PRICE' ? '#FFF8E7' : '#FFFFFF';
      
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.textAlign = line.textAlign || 'center';
      ctx.textBaseline = 'middle';
      
      lines.forEach((txt: string, idx: number) => {
        const vertOffset = (idx - (lines.length - 1) / 2) * lineHeight;
        if (line.rotation) {
          ctx.save();
          ctx.translate(xPos, yPos + vertOffset);
          ctx.rotate((line.rotation * Math.PI) / 180);
          ctx.fillText(txt, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(txt, xPos, yPos + vertOffset);
        }
      });
      ctx.restore();
    }
  }
}
