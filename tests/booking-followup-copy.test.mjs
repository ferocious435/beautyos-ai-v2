import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bookingSource = await readFile(new URL('../src/pages/Booking.tsx', import.meta.url), 'utf8');
const clientDashboardSource = await readFile(new URL('../src/pages/ClientDashboard.tsx', import.meta.url), 'utf8');

test('booking success keeps the client in control instead of auto-redirecting', () => {
  assert.doesNotMatch(bookingSource, /setTimeout\(\(\) => navigate\('\/calendar'\)/);
  assert.match(bookingSource, /מה קורה עכשיו\?/);
  assert.match(bookingSource, /התורים שלי/);
  assert.match(bookingSource, /קביעת תור נוסף/);
});

test('pending booking state explains what happens next', () => {
  assert.match(bookingSource, /התור יופיע אצלך כממתין לאישור/);
  assert.match(clientDashboardSource, /הבקשה נשלחה למאסטר ומחכה לאישור/);
  assert.match(clientDashboardSource, /ברגע שהתור יאושר תקבל\/י הודעה בטלגרם/);
});
