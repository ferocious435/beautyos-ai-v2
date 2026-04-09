 
 
/**
 * Removed bidi-js to prevent surrogate pair destruction and crashes.
 * Relying on napi-rs/canvas native Harfbuzz text shaping handling.
 */
export function getVisualBidiText(text: string): string {
  return text; // Native pass-through
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

