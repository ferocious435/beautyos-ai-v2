import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  skipWatermark?: boolean;
  style?: StyleOptions;
}

const SERIF_STACK = 'Assistant, "Playfair Display", "Noto Color Emoji", serif';
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
      { name: 'Noto Color Emoji', file: 'NotoColorEmoji.ttf' },
    ];

    for (const font of fontsToRegister) {
      const fullPath = path.join(fontsDir, font.file);
      if (fs.existsSync(fullPath)) {
        GlobalFonts.registerFromPath(fullPath, font.name);
      }
    }
  } catch (err) {
    console.error('[GraphicEngine] Font registration failed:', err);
  }

  fontsRegistered = true;
}

function isRtlText(text: string) {
  return RTL_CHAR.test(text);
}

function renderLiveMarketingOverlay(
  ctx: any,
  targetWidth: number,
  targetHeight: number,
  options: RenderOptions & { safeZone?: any },
) {
  const { overlay = [], safeZone } = options;
  const logo = overlay.find((line) => line.type === 'LOGO')?.text?.trim() || '';
  const logoZone = safeZone || {
    left: targetWidth * 0.05,
    right: targetWidth * 0.95,
  };

  if (logo || safeZone) {
    const brandText = logo || 'BeautyOS';
    ctx.save();
    ctx.font = `italic ${targetHeight > 1500 ? 34 : 28}px ${SERIF_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.textAlign = isRtlText(brandText) ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.direction = isRtlText(brandText) ? 'rtl' : 'ltr';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    const brandX = isRtlText(brandText) ? logoZone.right - 12 : logoZone.left + 12;
    ctx.fillText(brandText, brandX, targetHeight - targetHeight * 0.045);
    ctx.restore();
  }
}

export async function generateSocialPost(imageBuffer: Buffer, options: RenderOptions): Promise<Buffer> {
  ensureFonts();

  const { format, businessName = 'Beauty Expert' } = options;

  const targetWidth = 1080;
  let targetHeight = 1080;
  if (format === 'STORY_9_16') targetHeight = 1920;
  else if (format === 'INSTAGRAM_POST') targetHeight = 1350;
  else if (format === 'AI_SEED') targetHeight = options.theme === 'LUXURY_BLACK' ? 1920 : 1350;

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  const image = await loadImage(imageBuffer);

  if (format === 'ORIGINAL') {
    const originalCanvas = createCanvas(image.width, image.height);
    const originalContext = originalCanvas.getContext('2d');
    originalContext.drawImage(image, 0, 0);
    renderLiveMarketingOverlay(originalContext, image.width, image.height, options);
    return Buffer.from(originalCanvas.toBuffer('image/jpeg'));
  }

  const bgAspect = image.width / image.height;
  const bgCanvasAspect = targetWidth / targetHeight;
  let bgW: number;
  let bgH: number;
  let bgX: number;
  let bgY: number;

  if (bgAspect > bgCanvasAspect) {
    bgH = targetHeight;
    bgW = targetHeight * bgAspect;
    bgX = (targetWidth - bgW) / 2;
    bgY = 0;
  } else {
    bgW = targetWidth;
    bgH = targetWidth / bgAspect;
    bgX = 0;
    bgY = (targetHeight - bgH) / 2;
  }

  ctx.save();
  ctx.drawImage(image, bgX, bgY, bgW, bgH);
  if (format === 'AI_SEED') {
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    try {
      ctx.filter = 'blur(50px)';
      ctx.drawImage(canvas, 0, 0);
    } catch {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
  }
  ctx.restore();

  const imageAspect = image.width / image.height;
  const canvasAspect = targetWidth / targetHeight;
  const paddingX = targetWidth * 0.05;
  const paddingY = targetHeight * 0.06;
  const safeZone = {
    left: paddingX,
    right: targetWidth - paddingX,
    top: paddingY,
    bottom: targetHeight - paddingY,
    width: targetWidth - paddingX * 2,
    height: targetHeight - paddingY * 2,
  };

  ctx.save();
  let dx: number;
  let dy: number;
  let dw: number;
  let dh: number;

  if (format === 'AI_SEED') {
    const scale = 0.9;
    const innerW = targetWidth * scale;
    const innerH = targetHeight * scale;
    if (imageAspect > innerW / innerH) {
      dw = innerW;
      dh = innerW / imageAspect;
    } else {
      dh = innerH;
      dw = innerH * imageAspect;
    }
    dx = (targetWidth - dw) / 2;
    dy = (targetHeight - dh) / 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
  } else if (imageAspect > canvasAspect) {
    dh = targetHeight;
    dw = targetHeight * imageAspect;
    dx = (targetWidth - dw) / 2;
    dy = 0;
  } else {
    dw = targetWidth;
    dh = targetWidth / imageAspect;
    dx = 0;
    dy = (targetHeight - dh) / 2;
  }

  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();

  if (format !== 'AI_SEED' && !options.skipOverlay) {
    renderLiveMarketingOverlay(ctx, targetWidth, targetHeight, { ...options, safeZone });
  }

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
