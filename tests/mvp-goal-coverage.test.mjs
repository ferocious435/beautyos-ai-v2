import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  appSource,
  layoutSource,
  servicesSource,
  botSource,
  bookingSource,
  clientDashboardSource,
  dashboardSource,
  messagesSource,
  portfolioSource,
] = await Promise.all([
  read('src/App.tsx'),
  read('src/layouts/MainLayout.tsx'),
  read('api/services.ts'),
  read('api/_lib/bot-logic.ts'),
  read('src/pages/Booking.tsx'),
  read('src/pages/ClientDashboard.tsx'),
  read('src/pages/Dashboard.tsx'),
  read('src/pages/Messages.tsx'),
  read('src/pages/Portfolio.tsx'),
]);

test('MVP separates client, master and admin surfaces', () => {
  assert.match(appSource, /dashboard\/master/);
  assert.match(appSource, /dashboard\/client/);
  assert.match(layoutSource, /previewRole/);
  assert.match(layoutSource, /roles: \['client'\]/);
  assert.match(layoutSource, /roles: \['master', 'admin'\]/);
  assert.match(botSource, /preview_role_client/);
  assert.match(botSource, /preview_role_master/);
  assert.match(botSource, /chat_admin_overview/);
});

test('MVP booking path protects time, conflicts and service ownership', () => {
  assert.match(servicesSource, /isPastBookingStart\(startTime\)/);
  assert.match(servicesSource, /hasBookingOverlap\(supabase, mUser\.id, startTime, finalEndTime\)/);
  assert.match(servicesSource, /\.eq\('master_id', mUser\.id\)/);
  assert.match(servicesSource, /\.eq\('is_active', true\)/);
  assert.match(bookingSource, /min=\{new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\}/);
  assert.match(bookingSource, /slotTime > now/);
});

test('MVP gives the client a clear post-booking and self-service path', () => {
  assert.match(bookingSource, /מה קורה עכשיו\?/);
  assert.match(bookingSource, /התורים שלי/);
  assert.match(bookingSource, /קביעת תור נוסף/);
  assert.match(clientDashboardSource, /הבקשה נשלחה למאסטר ומחכה לאישור/);
  assert.match(clientDashboardSource, /handleCancel/);
  assert.match(clientDashboardSource, /rescheduleId/);
});

test('MVP gives the master services, schedule, messages and AI content tools', () => {
  assert.match(servicesSource, /case 'save-service'/);
  assert.match(servicesSource, /case 'get-day-schedule'/);
  assert.match(servicesSource, /case 'save-day-schedule'/);
  assert.match(dashboardSource, /סטודיו AI לתוכן ותמונות/);
  assert.match(dashboardSource, /api\/enhance/);
  assert.match(messagesSource, /מרכז/);
  assert.match(messagesSource, /https:\/\/t\.me\/BeautyOSAI_bot/);
  assert.doesNotMatch(dashboardSource, /AI Design Studio/);
  assert.doesNotMatch(dashboardSource, /Beauty Master/);
  assert.doesNotMatch(portfolioSource, /AI Creative/);
  assert.doesNotMatch(portfolioSource, /BeautyOS Gallery/);
});

test('MVP keeps Telegram-first conversation actions connected to real screens', () => {
  assert.match(botSource, /classifyConversationIntent/);
  assert.match(botSource, /sendBookingStartFromChat/);
  assert.match(botSource, /sendClientBookingsStartFromChat/);
  assert.match(botSource, /sendManagerCalendarStartFromChat/);
  assert.match(botSource, /sendManagerServicesStartFromChat/);
  assert.match(botSource, /sendTemplateMenuFromChat/);
  assert.match(botSource, /bot\.on\('photo'/);
  assert.match(botSource, /enqueueAiProcessing/);
});
