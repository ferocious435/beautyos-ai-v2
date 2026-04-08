 
 
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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

  let dw, dh, dx, dy;
  if (imgAspect > canvasAspect) {
    dw = targetWidth * 0.9; // Add slight safe padding for "Framed" look in AI_SEED
    dh = dw / imgAspect; 
    dx = (targetWidth - dw) / 2; 
    dy = (targetHeight - dh) / 2;
  } else {
    dh = targetHeight * 0.85; 
    dw = dh * imgAspect; 
    dx = (targetWidth - dw) / 2; 
    dy = (targetHeight - dh) / 2;
  }

  // Draw Main Image
  ctx.save();
  if (format !== 'AI_SEED') {
    // Normal centered fit
    if (imgAspect > canvasAspect) {
      dw = targetWidth; dh = targetWidth / imgAspect; dx = 0; dy = (targetHeight - dh) / 2;
    } else {
      dh = targetHeight; dw = targetHeight * imgAspect; dx = (targetWidth - dw) / 2; dy = 0;
    }
  }
  
  // Add subtle shadow for the "Framed" effect in AI_SEED
  if (format === 'AI_SEED') {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
  }
  
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  // Overlay
  if (format !== 'AI_SEED' && !options.skipOverlay) {
    renderOverlay(ctx, targetWidth, targetHeight, options);
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

function renderOverlay(ctx: unknown, targetWidth: number, targetHeight: number, options: RenderOptions) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { overlay = [], style, businessName } = options;
  
  const isLuxury = style?.preset?.includes('LUXURY') ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const primaryColor = style?.primaryColor || '#FFFFFF';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const borderColor = style?.borderColor || '#D4AF37'; 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const boxOpacity = style?.boxOpacity ?? 0.3;

  // Cinematic Darkener (Bottom only)
  const gradH = targetHeight * 0.45;
  const grad = ctx.createLinearGradient(0, targetHeight - gradH, 0, targetHeight);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, targetHeight - gradH, targetWidth, gradH);

  if (overlay && overlay.length > 0) {
    ctx.direction = 'rtl';

    for (const line of overlay) {
      const cleanText = (line.text || '').trim();
      if (!cleanText) continue;

      // --- CINEMATIC VIGNETTE (v65.1 READABILITY) ---
      // Top Darkener for TITLE (Conditional)
      const topGradH = targetHeight * 0.25;
      const topGrad = ctx.createLinearGradient(0, 0, 0, topGradH);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.5)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, targetWidth, topGradH);

      // 🕵️ VERSION MARKER (v65.1 PRO)
      ctx.save();
      ctx.font = '12px Sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'right';
      ctx.fillText('v65.1 PRO LIVE', targetWidth - 20, 25);
      ctx.restore();

      // 💎 LUXURY LOGO (Fixed Visibility v64.3)
      if (line.type === 'LOGO') {
        ctx.save();
        const logoSize = Math.round(42 * (targetWidth / 1080));
        ctx.font = `italic ${logoSize}px ${SERIF_STACK}, ${EMOJI_STACK}`;
        ctx.fillStyle = '#FFFFFF'; // Pure White for maximum visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 15;
        ctx.textAlign = line.textAlign || 'left';
        const lx = line.xPosition !== undefined ? line.xPosition * targetWidth : 60;
        const ly = line.yPosition !== undefined ? line.yPosition * targetHeight : targetHeight - 180; // Raised significantly
        ctx.fillText(cleanText, lx, ly);
        ctx.restore();
        continue;
      }

      // 📦 LUXURY MINIMAL (v64.3 Clean Mode)
      const lines = cleanText.split('\n');
      const fontSizeBase = Math.round((line.fontSize || 60) * (targetWidth / 1080));
      const activeFont = isLuxury && line.type === 'TITLE' ? SERIF_STACK : SANS_STACK;
      const xPos = line.xPosition !== undefined ? line.xPosition * targetWidth : targetWidth / 2;
      const yPos = (line.yPosition || 0.8) * targetHeight;

      ctx.font = `bold ${fontSizeBase}px ${activeFont}, ${EMOJI_STACK}`;
      let maxW = 0; lines.forEach(txt => { const w = ctx.measureText(txt).width; if (w > maxW) maxW = w; });
      const maxWidth = targetWidth * 0.88;
      let effSize = fontSizeBase;
      if (maxW > maxWidth) { effSize = Math.floor(fontSizeBase * (maxWidth / maxW)); ctx.font = `bold ${effSize}px ${activeFont}, ${EMOJI_STACK}`; }

      const lineHeight = effSize * 1.25;

      ctx.save();
      ctx.translate(xPos, yPos);
      if (line.rotation) ctx.rotate((line.rotation * Math.PI) / 180);

      // 🕵️ ULTIMATE READABILITY (v64.3 Contrast)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; 
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF'; // Ensure all text is bright white with shadow
      ctx.textAlign = line.textAlign || 'center';
      
      lines.forEach((txt, idx) => {
        ctx.fillText(txt, 0, idx * lineHeight);
      });
      ctx.restore();
    }
  }
}
