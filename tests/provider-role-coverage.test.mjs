import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const servicesSource = await readFile(new URL('../api/services.ts', import.meta.url), 'utf8');
const botSource = await readFile(new URL('../api/_lib/bot-logic.ts', import.meta.url), 'utf8');

test('solo owner with active services can remain bookable without pretending to be a separate master', () => {
  assert.match(servicesSource, /\.in\('role', \['master', 'admin'\]\)/);
  assert.match(servicesSource, /const canActAsBookableProvider = \(role\?: string \| null\) =>/);
  assert.match(servicesSource, /return enabledMasterIds\.has\(master\.id\) && \(canActAsBookableProvider\(master\.role\) \|\| isSelfPreviewMaster\);/);
  assert.match(servicesSource, /if \(!canActAsBookableProvider\(mUser\.role\) && !isAdminPreviewMaster\) {/);
});

test('chat booking entry also surfaces admin-owned services when they are truly bookable', () => {
  assert.match(botSource, /\.in\('role', \['master', 'admin'\]\)/);
});
