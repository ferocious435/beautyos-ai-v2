import bidi from 'bidi-js';

try {
  const bidiFactory = bidi.default || bidi;
  const bidiInstance = bidiFactory();
  const text = 'בנות אני מחכה 💅🔥';
  const embeddingLevels = bidiInstance.getEmbeddingLevels(text);
  const reorderedIndices = bidiInstance.getReorderedIndices(text, embeddingLevels);
  
  let result = '';
  for (const index of reorderedIndices) {
    result += text[index];
  }
  console.log('SUCCESS:', result);
} catch (e) {
  console.error('ERROR:', e.message);
}
