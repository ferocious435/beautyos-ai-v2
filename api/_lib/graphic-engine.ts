import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { OverlayLine } from './content-engine.js';
import { getVisualBidiText, wrapText } from './graphic-utils.js';

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

function roundedRectPath(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
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

function renderEditorialPanel(
  ctx: any,
  targetWidth: number,
  targetHeight: number,
  options: RenderOptions & { safeZone?: any },
) {
  const { overlay = [], format, safeZone } = options;
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

  const fadeHeight = targetHeight * (format === 'STORY_9_16' ? 0.34 : 0.28);
  const fade = ctx.createLinearGradient(0, targetHeight - fadeHeight, 0, targetHeight);
  fade.addColorStop(0, 'rgba(10, 10, 12, 0)');
  fade.addColorStop(1, 'rgba(10, 10, 12, 0.72)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, targetHeight - fadeHeight, targetWidth, fadeHeight);

  const panelInset = targetWidth * 0.05;
  const panelWidth = targetWidth - panelInset * 2;
  const panelHeight = targetHeight * (format === 'STORY_9_16' ? 0.2 : 0.18);
  const panelY = targetHeight - panelHeight - targetHeight * 0.045;

  ctx.save();
  roundedRectPath(ctx, panelInset, panelY, panelWidth, panelHeight, 34);
  const panelFill = ctx.createLinearGradient(panelInset, panelY, panelInset, panelY + panelHeight);
  panelFill.addColorStop(0, 'rgba(18, 18, 22, 0.88)');
  panelFill.addColorStop(1, 'rgba(10, 10, 12, 0.94)');
  ctx.fillStyle = panelFill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, panelInset + 26, panelY + 18, panelWidth * 0.16, 6, 6);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.92)';
  ctx.fill();
  ctx.restore();

  const leftColumnWidth = panelWidth * 0.28;
  const rightColumnX = panelInset + leftColumnWidth + 38;
  const rightColumnWidth = panelWidth - leftColumnWidth - 70;

  if (title) {
    ctx.save();
    ctx.font = `56px ${SANS_STACK}`;
    const titleFit = fitTextLines(ctx, title, rightColumnWidth, 56, SANS_STACK, 34);
    ctx.font = `700 ${titleFit.fontSize}px ${SANS_STACK}`;
    ctx.fillStyle = '#F8F6F1';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.34)';
    ctx.shadowBlur = 10;
    const lineHeight = titleFit.fontSize * 1.18;

    titleFit.lines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(getVisualBidiText(line), panelInset + panelWidth - 28, panelY + 48 + index * lineHeight);
    });
    ctx.restore();
  }

  if (promo) {
    const promoBoxWidth = rightColumnWidth;
    const promoBoxHeight = panelHeight * 0.34;
    const promoY = panelY + panelHeight - promoBoxHeight - 22;

    ctx.save();
    roundedRectPath(ctx, rightColumnX, promoY, promoBoxWidth, promoBoxHeight, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `52px ${SANS_STACK}`;
    const promoFit = fitTextLines(ctx, promo, promoBoxWidth - 44, 52, SANS_STACK, 28);
    ctx.font = `700 ${promoFit.fontSize}px ${SANS_STACK}`;
    ctx.fillStyle = '#F3D37A';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const lineHeight = promoFit.fontSize * 1.14;
    const visibleLines = promoFit.lines.slice(0, 2);

    visibleLines.forEach((line, index) => {
      const centeredYOffset = (index - (visibleLines.length - 1) / 2) * lineHeight;
      ctx.fillText(getVisualBidiText(line), rightColumnX + promoBoxWidth - 22, promoY + promoBoxHeight / 2 + centeredYOffset);
    });
    ctx.restore();
  }

  if (price) {
    const priceBoxX = panelInset + 24;
    const priceBoxY = panelY + 24;
    const priceBoxWidth = leftColumnWidth - 14;
    const priceBoxHeight = panelHeight * 0.38;

    ctx.save();
    roundedRectPath(ctx, priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight, 26);
    const priceFill = ctx.createLinearGradient(priceBoxX, priceBoxY, priceBoxX + priceBoxWidth, priceBoxY + priceBoxHeight);
    priceFill.addColorStop(0, 'rgba(255, 248, 231, 0.96)');
    priceFill.addColorStop(1, 'rgba(232, 204, 124, 0.96)');
    ctx.fillStyle = priceFill;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = `44px ${SANS_STACK}`;
    const priceFit = fitTextLines(ctx, price, priceBoxWidth - 28, 44, SANS_STACK, 24);
    ctx.font = `700 ${priceFit.fontSize}px ${SANS_STACK}`;
    ctx.fillStyle = '#1B1711';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const visibleLines = priceFit.lines.slice(0, 2);
    const lineHeight = priceFit.fontSize * 1.08;

    visibleLines.forEach((line, index) => {
      const centeredYOffset = (index - (visibleLines.length - 1) / 2) * lineHeight;
      ctx.fillText(getVisualBidiText(line), priceBoxX + priceBoxWidth / 2, priceBoxY + priceBoxHeight / 2 + centeredYOffset);
    });
    ctx.restore();
  }

  if (logo) {
    ctx.save();
    ctx.font = `italic 30px ${SERIF_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(getVisualBidiText(logo), panelInset + 30, panelY + panelHeight - 22);
    ctx.restore();
  } else if (safeZone) {
    ctx.save();
    ctx.font = `italic 24px ${SERIF_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('BeautyOS', safeZone.left + 12, panelY + panelHeight - 22);
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
    renderEditorialPanel(originalContext, image.width, image.height, options);
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
    renderEditorialPanel(ctx, targetWidth, targetHeight, { ...options, safeZone });
  }

  if (businessName && format !== 'AI_SEED' && !options.skipWatermark) {
    ctx.save();
    ctx.font = `italic 26px ${SERIF_STACK}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.direction = RTL_CHAR.test(businessName) ? 'rtl' : 'ltr';
    ctx.fillText(getVisualBidiText(businessName), targetWidth / 2, targetHeight - 38);
    ctx.restore();
  }

  return Buffer.from(canvas.toBuffer('image/jpeg'));
}
