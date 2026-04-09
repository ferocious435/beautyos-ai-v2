 
 
import bidi from 'bidi-js';

const bidiFactory = bidi.default || bidi;

/**
 * Превращает строку на иврите (RTL) в визуально упорядоченную строку 
 * для корректного отображения в библиотеках рендеринга.
 */
export function getVisualBidiText(text: string): string {
  if (!text) return '';
  
  try {
    const bidiInstance = bidiFactory();
    const embeddingLevels = bidiInstance.getEmbeddingLevels(text);
    const reorderedIndices = bidiInstance.getReorderedIndices(text, embeddingLevels);
    
    let result = '';
    for (const index of reorderedIndices) {
      result += text[index];
    }
    
    return result;
  } catch (err) {
    console.error('BIDI ERROR:', err);
    // Fallback: просто перевернуть строку, если это чистый иврит без чисел/пунктуации
    return text.split('').reverse().join('');
  }
}
/**
 * Разбивает текст на строки так, чтобы каждая строка не превышала maxWidth.
 * Учитывает текущие настройки шрифта в ctx и корректно обрабатывает RTL (иврит).
 */
export function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  if (!text) return [];
  
  // Если в тексте уже есть переносы, сохраняем их как базу
  const initialLines = text.split('\n');
  const finalLines: string[] = [];

  for (const line of initialLines) {
    const words = line.split(' ');
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
      // Важно: для измерения ширины иврита нужно использовать визуальный текст
      const visualTestLine = getVisualBidiText(testLine);
      const metrics = ctx.measureText(visualTestLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        finalLines.push(getVisualBidiText(currentLine));
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      finalLines.push(getVisualBidiText(currentLine));
    }
  }

  return finalLines;
}
