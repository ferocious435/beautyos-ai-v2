import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDestinationUrl, normalizePublicUrl } from '../api/_lib/qstash.ts';

test('destination URL keeps reminder query intact for QStash publishing', () => {
  const destinationUrl = buildDestinationUrl(
    'https://example.com/',
    '/api/services?action=reminder',
  );

  assert.equal(destinationUrl, 'https://example.com/api/services?action=reminder');
});

test('public app URL is safe for worker destinations', () => {
  assert.equal(normalizePublicUrl('beautyos-ai-v2.vercel.app/'), 'https://beautyos-ai-v2.vercel.app');
  assert.equal(normalizePublicUrl(' https://beautyos-ai-v2.vercel.app\r\n '), 'https://beautyos-ai-v2.vercel.app');
  assert.equal(normalizePublicUrl('', 'beautyos-preview.vercel.app'), 'https://beautyos-preview.vercel.app');
  assert.equal(normalizePublicUrl('ftp://example.com'), '');
});
