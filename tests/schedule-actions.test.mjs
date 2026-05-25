import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const servicesSource = await readFile(new URL('../api/services.ts', import.meta.url), 'utf8');
const dayManagerSource = await readFile(new URL('../src/components/DayManager.tsx', import.meta.url), 'utf8');
const masterCalendarSource = await readFile(new URL('../src/pages/MasterCalendar.tsx', import.meta.url), 'utf8');

test('masters can load and save weekly working hours through server actions', () => {
  assert.match(servicesSource, /case 'get-day-schedule'/);
  assert.match(servicesSource, /case 'save-day-schedule'/);
  assert.match(servicesSource, /from\('master_schedules'\)/);
  assert.match(servicesSource, /onConflict: 'master_id,day_of_week'/);
});

test('schedule changes are restricted to manager roles and fresh Telegram auth', () => {
  assert.match(servicesSource, /'save-day-schedule'/);
  assert.match(servicesSource, /sensitiveSecureActions[\s\S]*'save-day-schedule'/);
  assert.match(servicesSource, /!\['master', 'admin'\]\.includes\(profile\.role\)/);
});

test('master calendar exposes the day manager instead of a disabled placeholder', () => {
  assert.match(masterCalendarSource, /<DayManager/);
  assert.match(dayManagerSource, /action=save-day-schedule/);
  assert.doesNotMatch(dayManagerSource, /not enabled yet/i);
});
