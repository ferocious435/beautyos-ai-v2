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
