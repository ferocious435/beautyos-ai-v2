import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const configSource = await readFile(new URL('../api/_lib/config.ts', import.meta.url), 'utf8');

test('AI config remaps legacy text model aliases to a supported production model', () => {
  assert.match(configSource, /'models\/gemini-3\.1-flash-live-preview': 'models\/gemini-2\.5-flash'/);
  assert.match(configSource, /ANALYSIS: normalizeModel\(process\.env\.MODEL_ANALYSIS, 'models\/gemini-2\.5-flash'/);
  assert.match(configSource, /CONTENT: normalizeModel\(process\.env\.MODEL_CONTENT, 'models\/gemini-2\.5-flash'/);
});

test('AI config remaps legacy image aliases to a supported image generation model', () => {
  assert.match(configSource, /'models\/imagen-4\.0-generate-001': 'models\/gemini-2\.5-flash-image'/);
  assert.match(configSource, /ENHANCEMENT: normalizeModel\(process\.env\.MODEL_ENHANCEMENT, 'models\/gemini-2\.5-flash-image'/);
  assert.match(configSource, /IMAGE: normalizeModel\(process\.env\.MODEL_IMAGE, 'models\/gemini-2\.5-flash-image'/);
});
