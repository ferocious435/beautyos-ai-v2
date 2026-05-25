import assert from 'node:assert/strict';
import test from 'node:test';

import { filterFutureSlots, isPastBookingStart, parseIsoDateTime } from '../api/_lib/booking-time.ts';

test('parses valid booking times and rejects bad values', () => {
  assert.ok(parseIsoDateTime('2026-05-24T12:30:00.000Z'));
  assert.equal(parseIsoDateTime(''), null);
  assert.equal(parseIsoDateTime('not-a-date'), null);
});

test('marks only past or current starts as invalid for booking', () => {
  const now = Date.parse('2026-05-24T12:00:00.000Z');

  assert.equal(isPastBookingStart('2026-05-24T11:59:00.000Z', now), true);
  assert.equal(isPastBookingStart('2026-05-24T12:00:00.000Z', now), true);
  assert.equal(isPastBookingStart('2026-05-24T12:01:00.000Z', now), false);
});

test('keeps only future slots for the customer', () => {
  const now = Date.parse('2026-05-24T12:00:00.000Z');
  const slots = [
    { slot_time: '2026-05-24T11:45:00.000Z' },
    { slot_time: '2026-05-24T12:00:00.000Z' },
    { slot_time: '2026-05-24T12:15:00.000Z' },
    { slot_time: '2026-05-24T12:30:00.000Z' },
  ];

  assert.deepEqual(filterFutureSlots(slots, now), [
    { slot_time: '2026-05-24T12:15:00.000Z' },
    { slot_time: '2026-05-24T12:30:00.000Z' },
  ]);
});

test('booking source keeps Telegram notification failures non-blocking', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../api/services.ts', import.meta.url), 'utf8'));

  assert.match(source, /safeTelegramSend/);
  assert.match(source, /safeTelegramBatch/);
  assert.doesNotMatch(source, /await Promise\.all\(\[\s*bot\.telegram\.sendMessage/);
});
