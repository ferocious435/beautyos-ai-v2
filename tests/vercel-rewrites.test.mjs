import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const spaRewrite = config.rewrites.find((rewrite) => rewrite.destination === '/index.html');
const pattern = new RegExp(`^${spaRewrite.source}$`);

test('SPA rewrite accepts client routes', () => {
  for (const path of ['/settings', '/pricing', '/portfolio', '/booking', '/dashboard/master', '/dashboard/client', '/discovery']) {
    assert.match(path, pattern, `${path} should use the SPA fallback`);
  }
});

test('SPA rewrite does not swallow API, Vite modules, or assets', () => {
  for (const path of ['/api/services', '/src/main.tsx', '/@vite/client', '/@react-refresh', '/node_modules/foo.js', '/assets/app.js', '/favicon.svg']) {
    assert.doesNotMatch(path, pattern, `${path} should not use the SPA fallback`);
  }
});
