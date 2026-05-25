import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublishUrl, normalizePublicUrl } from '../api/_lib/qstash.ts';

test('QStash publish URL keeps destination query inside the encoded path', () => {
  const publishUrl = buildPublishUrl(
    'https://qstash.upstash.io',
    'https://example.com/api/services?action=reminder'
  );
  const parsed = new URL(publishUrl);

  assert.equal(parsed.origin, 'https://qstash.upstash.io');
  assert.equal(parsed.search, '');
  assert.equal(
    parsed.pathname,
    '/v2/publish/https%3A%2F%2Fexample.com%2Fapi%2Fservices%3Faction%3Dreminder'
  );
});

test('public app URL is safe for QStash destination paths', () => {
  assert.equal(normalizePublicUrl('beautyos-ai-v2.vercel.app/'), 'https://beautyos-ai-v2.vercel.app');
  assert.equal(normalizePublicUrl(' https://beautyos-ai-v2.vercel.app\r\n '), 'https://beautyos-ai-v2.vercel.app');
  assert.equal(normalizePublicUrl('', 'beautyos-preview.vercel.app'), 'https://beautyos-preview.vercel.app');
  assert.equal(normalizePublicUrl('ftp://example.com'), '');
});
