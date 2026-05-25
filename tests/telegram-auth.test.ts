import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { validateTelegramWebAppData } from '../api/_lib/telegram-auth.ts';

const botToken = '123456:test-token';

const signedInitData = (authDate: number) => {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'test-query',
    user: JSON.stringify({ id: 123456, first_name: 'Test' }),
  });

  params.sort();
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);

  return params.toString();
};

test('Telegram initData validator accepts fresh signed data', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  assert.equal(validateTelegramWebAppData(signedInitData(nowSeconds), botToken, 10 * 60), true);
});

test('Telegram initData validator rejects stale data for sensitive actions', () => {
  const staleSeconds = Math.floor(Date.now() / 1000) - (11 * 60);

  assert.equal(validateTelegramWebAppData(signedInitData(staleSeconds), botToken, 10 * 60), false);
});
