import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublishUrl } from '../api/_lib/qstash.ts';

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
