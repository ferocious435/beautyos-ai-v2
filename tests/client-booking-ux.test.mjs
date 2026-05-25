import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  bookingSource,
  clientDashboardSource,
  discoverySource,
  displayNamesSource,
  botSource,
] = await Promise.all([
  read('src/pages/Booking.tsx'),
  read('src/pages/ClientDashboard.tsx'),
  read('src/pages/Discovery.tsx'),
  read('src/lib/displayNames.ts'),
  read('api/bot.ts'),
]);

test('client booking asks for confirmation before sending the request', () => {
  assert.match(bookingSource, /selectedSlotTime/);
  assert.match(bookingSource, /setSelectedSlotTime\(slot\.slot_time\)/);
  assert.match(bookingSource, /לאשר בקשת תור\?/);
  assert.match(bookingSource, /handleBook\(selectedSlotTime\)/);
  assert.doesNotMatch(bookingSource, /onClick=\{\(\) => handleBook\(slot\.slot_time\)\}/);
});

test('client booking has a clear way to go back from each step', () => {
  assert.match(bookingSource, /const handleBack = \(\) =>/);
  assert.match(bookingSource, /setSelectedSlotTime\(null\)/);
  assert.match(bookingSource, /setSelectedService\(null\)/);
  assert.match(bookingSource, /navigate\(rescheduleId \? '\/calendar' : '\/discovery'\)/);
});

test('client preview is not mixed with business-owner onboarding', () => {
  assert.match(clientDashboardSource, /showBusinessInvite/);
  assert.match(clientDashboardSource, /appUser\.role === 'client' && !previewRole/);
});

test('provider display hides internal admin naming from customer-facing screens', () => {
  assert.match(displayNamesSource, /core admin/i);
  assert.match(bookingSource, /displayProviderName\(master\)/);
  assert.match(clientDashboardSource, /displayProviderName\(upcoming\.master\)/);
  assert.match(discoverySource, /displayProviderName\(master\)/);
});

test('bot command menu is refreshed with readable Hebrew descriptions', () => {
  assert.match(botSource, /setMyCommands/);
  assert.match(botSource, /פתיחת BeautyOS והמיני אפ/);
  assert.match(botSource, /בחירת מצב בדיקה/);
});
