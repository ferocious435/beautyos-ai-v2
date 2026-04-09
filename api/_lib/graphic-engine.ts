 
 
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { wrapText } from './graphic-utils.js';
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
  style?: StyleOptions; 
}

// --- FONT SYSTEM v60 (Luxury Art-Director Edition) ---
const SANS_STACK = 'Assistant, sans-serif';
const SERIF_STACK = '"Playfair Display", serif';
const EMOJI_STACK = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

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
 * Marketing Art-Director Graphic Engine v2.6.2
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
  else if (format === 'AI_SEED') targetHeight = 1350;

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

  // --- BACKGROUND ENGINE (v65.0 - Blurred Seed) ---
  if (format === 'AI_SEED') {
    // Draw blurred cover background to provide context for AI outpainting
    const bAspect = image.width / image.height;
    const cAspect = targetWidth / targetHeight;
    let bw, bh, bx, by;
    if (bAspect > cAspect) {
      bh = targetHeight; bw = targetHeight * bAspect; bx = (targetWidth - bw) / 2; by = 0;
    } else {
      bw = targetWidth; bh = targetWidth / bAspect; bx = (targetWidth - bw) / 2; by = 0;
    }
    
    ctx.save();
    ctx.drawImage(image, bx, by, bw, bh);
    // Darken and blur (simulated via multiple draws or filter if supported)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    try {
      // @ts-expect-error - setting custom filter
      ctx.filter = 'blur(60px)';
      ctx.drawImage(canvas, 0, 0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Fallback for environments without filter support
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.fillRect(0,0, targetWidth, targetHeight);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#0a0a0a'; // Premium Deep Black
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  const imgAspect = image.width / image.height;
  const canvasAspect = targetWidth / targetHeight;

  // --- DYNAMIC COMPOSITION ENGINE v66.1 (Safe Zones & Auto-Scaling) ---
  const paddingX = targetWidth * 0.05; // 5% horizontal padding
  const paddingY = targetHeight * 0.06; // 6% vertical padding
  const safeZone = {
    left: paddingX,
    right: targetWidth - paddingX,
    top: paddingY,
    bottom: targetHeight - paddingY,
    width: targetWidth - (paddingX * 2),
    height: targetHeight - (paddingY * 2)
  };

  // Draw Main Image
  ctx.save();
  
  let dx, dy, dw, dh;
  if (format === 'AI_SEED') {
    // --- FRAMED SEED LOGIC (v66.2) ---
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

  // Branding
  if (businessName && format !== 'AI_SEED') {
    ctx.font = `24px Assistant`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(businessName, targetWidth / 2, targetHeight - 40);
  }

  return Buffer.from(canvas.toBuffer('image/jpeg'));
}

function renderOverlay(ctx: any, targetWidth: number, targetHeight: number, options: RenderOptions & { safeZone?: any }) {
  const { overlay = [], style, safeZone } = options;
  
  const isLuxury = style?.preset?.includes('LUXURY') ?? false;
  
  // Cinematic Darkener (Bottom only)
  const gradH = targetHeight * 0.45;
  const grad = ctx.createLinearGradient(0, targetHeight - gradH, 0, targetHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, targetHeight - gradH, targetWidth, gradH);

  if (overlay && overlay.length > 0) {
    ctx.direction = 'ltr';

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

      // 💎 LUXURY LOGO (Fixed Visibility v64.3)
      if (line.type === 'LOGO') {
        ctx.save();
        const logoSize = Math.round(42 * (targetWidth / 1080));
        ctx.font = `italic ${logoSize}px ${SERIF_STACK}, ${EMOJI_STACK}`;
        ctx.fillStyle = '#FFFFFF'; 
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 15;
        ctx.textAlign = line.textAlign || 'left';
        
        let lx = line.xPosition !== undefined ? line.xPosition * targetWidth : 60;
        let ly = line.yPosition !== undefined ? line.yPosition * targetHeight : targetHeight - 180;

        // Apply Safe Zone constraints
        if (safeZone) {
          lx = Math.max(safeZone.left, Math.min(safeZone.right - 100, lx));
          ly = Math.max(safeZone.top + 40, Math.min(safeZone.bottom, ly));
        }

        ctx.fillText(cleanText, lx, ly);
        ctx.restore();
        continue;
      }

      // --- INTELLIGENT WRAPPING & SCALING v66.1 ---
      const activeFont = isLuxury && line.type === 'TITLE' ? SERIF_STACK : SANS_STACK;
      const fontSizeBase = Math.round((line.fontSize || 60) * (targetWidth / 1080));
      const maxWidth = safeZone ? safeZone.width : targetWidth * 0.9;
      
      ctx.font = `bold ${fontSizeBase}px ${activeFont}, ${EMOJI_STACK}`;
      
      let lines = wrapText(ctx, cleanText, maxWidth);
      let effSize = fontSizeBase;
      const maxBlockH = targetHeight * 0.25;
      
      // Recursive shrink to fit height/width limits
      while (lines.length * (effSize * 1.3) > maxBlockH && effSize > 24) {
        effSize -= 4;
        ctx.font = `bold ${effSize}px ${activeFont}, ${EMOJI_STACK}`;
        lines = wrapText(ctx, cleanText, maxWidth);
      }

      const lineHeight = effSize * 1.3;
      let xPos = line.xPosition !== undefined ? line.xPosition * targetWidth : targetWidth / 2;
      let yPos = (line.yPosition || 0.8) * targetHeight;

      // Safe Zone clipping for positions
      if (safeZone) {
        xPos = Math.max(safeZone.left + (effSize), Math.min(safeZone.right - (effSize), xPos));
        yPos = Math.max(safeZone.top + (lines.length * lineHeight / 2), Math.min(safeZone.bottom - (lines.length * lineHeight / 2), yPos));
      }

      ctx.save();
      ctx.translate(xPos, yPos);
      if (line.rotation) ctx.rotate((line.rotation * Math.PI) / 180);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; 
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = line.textAlign || 'center';
      
      lines.forEach((txt, idx) => {
        const vertOffset = (idx - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(txt, 0, vertOffset);
      });
      ctx.restore();
    }
  }
}
