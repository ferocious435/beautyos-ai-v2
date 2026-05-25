import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const servicesSource = await readFile(new URL('../api/services.ts', import.meta.url), 'utf8');
const clientDashboardSource = await readFile(new URL('../src/pages/ClientDashboard.tsx', import.meta.url), 'utf8');

test('client can explicitly activate business/master mode from the mini app', () => {
  assert.match(servicesSource, /case 'activate-master'/);
  assert.match(servicesSource, /role: nextRole/);
  assert.match(clientDashboardSource, /action=activate-master/);
  assert.match(clientDashboardSource, /navigate\('\/settings'\)/);
});

test('master activation is a sensitive authenticated action', () => {
  assert.match(servicesSource, /secureActions[\s\S]*'activate-master'/);
  assert.match(servicesSource, /sensitiveSecureActions[\s\S]*'activate-master'/);
  assert.match(servicesSource, /validateTelegramWebAppData\(initData, botToken, telegramAuthMaxAgeSeconds\)/);
});
