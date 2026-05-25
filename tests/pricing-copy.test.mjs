import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layoutSource = await readFile(new URL('../src/layouts/MainLayout.tsx', import.meta.url), 'utf8');
const pricingSource = await readFile(new URL('../src/pages/Pricing.tsx', import.meta.url), 'utf8');
const settingsSource = await readFile(new URL('../src/pages/Settings.tsx', import.meta.url), 'utf8');
const botSource = await readFile(new URL('../api/_lib/bot-logic.ts', import.meta.url), 'utf8');

test('app navigation separates subscription from service prices', () => {
  assert.match(layoutSource, /label: 'מנוי'/);
  assert.match(layoutSource, /label: 'שירותים'/);
});

test('pricing page explains it is the BeautyOS subscription, not client-facing service prices', () => {
  assert.match(pricingSource, /מינוי BeautyOS/);
  assert.match(pricingSource, /מחירי הטיפולים שלך מנוהלים במסך שירותים ומחירים/);
});

test('settings page is the home for services and prices', () => {
  assert.match(settingsSource, /שירותים ומחירים/);
  assert.match(settingsSource, /הוספה או עריכה של שירות ומחיר/);
});

test('bot copy does not point masters to subscription plans when they ask about treatment prices', () => {
  assert.match(botSource, /מינוי BeautyOS/);
  assert.match(botSource, /עריכת שירותים ומחירים/);
});
