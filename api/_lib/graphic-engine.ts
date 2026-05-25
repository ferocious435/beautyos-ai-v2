import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { OverlayLine } from './content-engine.js';
import { wrapText } from './graphic-utils.js';

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

const SANS_STACK = 'Assistant, "Noto Color Emoji", sans-serif';
const SERIF_STACK = 'Assistant, "Playfair Display", "Noto Color Emoji", serif';
const RTL_CHAR = /[\u0590-\u05FF\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
type TextAlign = 'left' | 'right' | 'center';

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

function fitTextLines(ctx: any, text: string, maxWidth: number, startingSize: number, fontFamily: string, minSize = 24) {
  let fontSize = startingSize;
  ctx.font = `${fontSize}px ${fontFamily}`;
  let lines = wrapText(ctx, text, maxWidth);

  while (fontSize > minSize) {
    const widestLine = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    if (widestLine <= maxWidth) break;

    fontSize -= 4;
    ctx.font = `${fontSize}px ${fontFamily}`;
    lines = wrapText(ctx, text, maxWidth);
  }

  return { fontSize, lines };
}

function isRtlText(text: string) {
  return RTL_CHAR.test(text);
}

function drawSmartText(
  ctx: any,
  text: string,
  x: number,
  y: number,
  options: {
    maxWidth: number;
    fontSize: number;
    minSize?: number;
    color: string;
    align?: TextAlign;
    fontFamily?: string;
    maxLines?: number;
    lineHeight?: number;
    shadow?: boolean;
  },
) {
  if (!text.trim()) return { width: 0, height: 0, lines: [] as string[] };

  const fontFamily = options.fontFamily || SANS_STACK;
  const fit = fitTextLines(ctx, text, options.maxWidth, options.fontSize, fontFamily, options.minSize || 22);
  const lines = fit.lines.slice(0, options.maxLines || 2);
  const lineHeight = options.lineHeight || fit.fontSize * 1.15;
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);

  ctx.save();
  ctx.font = `700 ${fit.fontSize}px ${fontFamily}`;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align || (isRtlText(text) ? 'right' : 'left');
  ctx.textBaseline = 'top';
  ctx.direction = isRtlText(text) ? 'rtl' : 'ltr';

  if (options.shadow !== false) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 3;
  }

  lines.forEach((line, index) => {
    ctx.lineWidth = Math.max(4, fit.fontSize * 0.08);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.strokeText(line, x, y + index * lineHeight);
    ctx.fillText(line, x, y + index * lineHeight);
  });
  ctx.restore();

  return { width: options.maxWidth, height: blockHeight, lines };
}

function getImageDetailScore(ctx: any, x: number, y: number, width: number, height: number) {
  const sampleWidth = Math.max(8, Math.min(42, Math.floor(width / 18)));
  const sampleHeight = Math.max(8, Math.min(42, Math.floor(height / 18)));
  const imageData = ctx.getImageData(x, y, width, height).data;
  const stepX = Math.max(1, Math.floor(width / sampleWidth));
  const stepY = Math.max(1, Math.floor(height / sampleHeight));
  let previous = 0;
  let totalDiff = 0;
  let samples = 0;

  for (let py = 0; py < height; py += stepY) {
    for (let px = 0; px < width; px += stepX) {
      const idx = (py * width + px) * 4;
      const luminance = imageData[idx] * 0.2126 + imageData[idx + 1] * 0.7152 + imageData[idx + 2] * 0.0722;
      if (samples > 0) totalDiff += Math.abs(luminance - previous);
      previous = luminance;
      samples++;
    }
  }

  return samples ? totalDiff / samples : 0;
}

function pickCalmRegion(
  ctx: any,
  targetWidth: number,
  targetHeight: number,
  variant: 'headline' | 'price' | 'brand',
  occupied: Array<{ x: number; y: number; boxWidth: number; boxHeight: number }> = [],
) {
  const margin = targetWidth * 0.06;
  const boxWidth = targetWidth * (variant === 'headline' ? 0.38 : 0.24);
  const boxHeight = targetHeight * (variant === 'headline' ? 0.18 : 0.11);
  const candidates = [
    { x: margin, y: targetHeight * 0.08, align: 'left' as TextAlign },
    { x: targetWidth - margin - boxWidth, y: targetHeight * 0.08, align: 'right' as TextAlign },
    { x: margin, y: targetHeight * 0.68, align: 'left' as TextAlign },
    { x: targetWidth - margin - boxWidth, y: targetHeight * 0.68, align: 'right' as TextAlign },
    { x: margin, y: targetHeight * 0.42, align: 'left' as TextAlign },
    { x: targetWidth - margin - boxWidth, y: targetHeight * 0.42, align: 'right' as TextAlign },
  ];

  const centerX = targetWidth / 2;
  const centerY = targetHeight / 2;
  const scored = candidates.map((candidate) => {
    const detail = getImageDetailScore(
      ctx,
      Math.max(0, Math.floor(candidate.x)),
      Math.max(0, Math.floor(candidate.y)),
      Math.min(Math.floor(boxWidth), targetWidth - Math.floor(candidate.x)),
      Math.min(Math.floor(boxHeight), targetHeight - Math.floor(candidate.y)),
    );
    const cx = candidate.x + boxWidth / 2;
    const cy = candidate.y + boxHeight / 2;
    const centerPenalty =
      Math.max(0, 1 - Math.abs(cx - centerX) / (targetWidth * 0.34)) * 16 +
      Math.max(0, 1 - Math.abs(cy - centerY) / (targetHeight * 0.3)) * 10;
    const bottomPenalty = variant === 'headline' && candidate.y > targetHeight * 0.55 ? 12 : 0;
    const overlapPenalty = occupied.some((area) => {
      const overlapX = candidate.x < area.x + area.boxWidth && candidate.x + boxWidth > area.x;
      const overlapY = candidate.y < area.y + area.boxHeight && candidate.y + boxHeight > area.y;
      return overlapX && overlapY;
    }) ? 40 : 0;
    return { ...candidate, boxWidth, boxHeight, score: detail + centerPenalty + bottomPenalty + overlapPenalty };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}

function renderLiveMarketingOverlay(
  ctx: any,
  targetWidth: number,
  targetHeight: number,
  options: RenderOptions & { safeZone?: any },
) {
  const { overlay = [], safeZone } = options;
  const overlayByType = new Map<string, OverlayLine>();

  for (const line of overlay) {
    const type = line.type || 'TEXT';
    const cleanText = (line.text || '').trim();
    if (!cleanText) continue;
    overlayByType.set(type, { ...line, text: cleanText });
  }

  const title = overlayByType.get('TITLE')?.text || '';
  const promo = overlayByType.get('PROMO')?.text || '';
  const price = overlayByType.get('PRICE')?.text || '';
  const logo = overlayByType.get('LOGO')?.text || '';

  if (!title && !promo && !price && !logo) return;

  const headlineText = [title, promo].filter(Boolean).join('\n');
  const headlineRegion = pickCalmRegion(ctx, targetWidth, targetHeight, 'headline');
  const headlineX = headlineRegion.align === 'right'
    ? headlineRegion.x + headlineRegion.boxWidth
    : headlineRegion.x;

  if (headlineText) {
    drawSmartText(ctx, headlineText, headlineX, headlineRegion.y, {
      maxWidth: headlineRegion.boxWidth,
      fontSize: targetHeight > 1500 ? 62 : 48,
      minSize: 30,
      color: '#FFF9EA',
      align: headlineRegion.align,
      maxLines: 3,
      lineHeight: targetHeight > 1500 ? 68 : 54,
    });
  }

  if (price) {
    const priceRegion = pickCalmRegion(ctx, targetWidth, targetHeight, 'price', [headlineRegion]);
    const priceX = priceRegion.align === 'right'
      ? priceRegion.x + priceRegion.boxWidth
      : priceRegion.x;

    drawSmartText(ctx, price, priceX, priceRegion.y, {
      maxWidth: priceRegion.boxWidth,
      fontSize: targetHeight > 1500 ? 60 : 44,
      minSize: 28,
      color: '#FFE08A',
      align: priceRegion.align,
      maxLines: 2,
      lineHeight: targetHeight > 1500 ? 64 : 48,
    });
  }

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
    const brandX = isRtlText(brandText) ? safeZone.right - 12 : safeZone.left + 12;
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
    dw = targetWidth;
    dh = targetWidth / imageAspect;
    dx = 0;
    dy = (targetHeight - dh) / 2;
  } else {
    dh = targetHeight;
    dw = targetHeight * imageAspect;
    dx = (targetWidth - dw) / 2;
    dy = 0;
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
