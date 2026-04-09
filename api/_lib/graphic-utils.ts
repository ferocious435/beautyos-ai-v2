
// @ts-expect-error - bidi-js has no type definitions
import bidi from 'bidi-js';

// --- BiDi Engine v2.0 (Emoji-Safe) ---

const RTL_CHAR = /[\u0590-\u05FF\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let bidiInstance: any = null;

function getBidi() {
  if (!bidiInstance) {
    try {
      const f = (bidi as any).default || bidi;
      bidiInstance = typeof f === 'function' ? f() : f;
      console.log('[BiDi] Engine initialized successfully');
    } catch (e) {
      console.error('[BiDi] Init failed:', e);
    }
  }
  return bidiInstance;
}

/**
 * Splits text into grapheme clusters for safe emoji handling.
 * Uses Intl.Segmenter (Node 16+) with fallback to Array.from.
 */
function toGraphemes(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('he', { granularity: 'grapheme' });
    return [...seg.segment(text)].map(s => s.segment);
  } catch {
    return Array.from(text);
  }
}

/**
 * Converts logical-order BiDi text to visual order for canvas rendering.
 * 
 * Problem: @napi-rs/canvas draws chars left-to-right regardless of script.
 * For Hebrew text "בנות אני מחכה", the canvas renders ב on the LEFT — wrong!
 * 
 * Solution: Reorder characters to visual order using the Unicode BiDi Algorithm (bidi-js).
 * After reordering, canvas draws the rightmost Hebrew char first (at the left edge),
 * producing correct RTL visual output.
 * 
 * Emoji safety: Multi-char graphemes (emoji sequences) are replaced with single-char
 * Private Use Area placeholders before BiDi processing, then restored after reordering.
 */
export function getVisualBidiText(text: string): string {
  if (!text || !RTL_CHAR.test(text)) return text;

  const inst = getBidi();
  if (!inst) return text;

  try {
    const graphemes = toGraphemes(text);

    // Replace multi-char graphemes with PUA placeholders (safe for bidi-js)
    const reverseMap = new Map<string, string>();
    let puaCode = 0xE000; // Start of Private Use Area (U+E000..U+F8FF)

    const safeParts: string[] = [];
    for (const g of graphemes) {
      if (g.length === 1) {
        // Single BMP char — safe for bidi-js
        safeParts.push(g);
      } else {
        // Multi-char grapheme (emoji, combined char, surrogate pair)
        const ph = String.fromCharCode(puaCode++);
        reverseMap.set(ph, g);
        safeParts.push(ph);
      }
    }

    const safeText = safeParts.join('');

    // Run Unicode BiDi Algorithm
    const levels = inst.getEmbeddingLevels(safeText);
    const indices = inst.getReorderedIndices(safeText, levels);

    // Reconstruct in visual order, restoring original graphemes
    let result = '';
    for (const idx of indices) {
      const ch = safeText[idx];
      result += reverseMap.get(ch) || ch;
    }

    return result;
  } catch (e) {
    console.error('[BiDi] Processing error, returning original:', e);
    return text;
  }
}

/**
 * Разбивает текст на строки так, чтобы каждая строка не превышала maxWidth.
 * Учитывает текущие настройки шрифта в ctx.
 */
export function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  if (!text) return [];
  
  const initialLines = text.split('\n');
  const finalLines: string[] = [];

  for (const line of initialLines) {
    const words = line.split(' ');
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        finalLines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      finalLines.push(currentLine);
    }
  }

  return finalLines;
}
