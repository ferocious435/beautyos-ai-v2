import bidi from 'bidi-js';

try {
  const bidiFactory = bidi.default || bidi;
  const bidiInstance = bidiFactory();
  const embeddingLevels = bidiInstance.getEmbeddingLevels('בנות אני מחכה');
  console.log('SUCCESS:', embeddingLevels);
} catch (e) {
  console.error('ERROR:', e.message);
}
