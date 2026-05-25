import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyConversationIntent, detectBookingRequestTarget } from '../api/_lib/conversation-intent.ts';

test('detects appointment action versus appointment question', () => {
  assert.deepEqual(
    pick(classifyConversationIntent('תקבע לי תור למחר בבוקר')),
    { intent: 'appointment', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('איך קובעים תור?')),
    { intent: 'appointment', mode: 'inform' }
  );
});

test('detects image/post action versus interest', () => {
  assert.deepEqual(
    pick(classifyConversationIntent('תכין לי פוסט לאינסטגרם')),
    { intent: 'image_post', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('מה קורה עם פוסטים ותמונות?')),
    { intent: 'image_post', mode: 'inform' }
  );
});

test('detects core mini app areas from normal language', () => {
  assert.deepEqual(
    pick(classifyConversationIntent('תפתח יומן')),
    { intent: 'calendar', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('אפשר לראות מחירון?')),
    { intent: 'pricing', mode: 'inform' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('ברכה ללקוחה')),
    { intent: 'messages', mode: 'clarify' }
  );
});

test('keeps risky or ambiguous wording in the right mode', () => {
  assert.deepEqual(
    pick(classifyConversationIntent('בטל את התור שלי')),
    { intent: 'appointment', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('אפשר לבטל תור?')),
    { intent: 'appointment', mode: 'inform' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('תזיזי לי את התור למחר')),
    { intent: 'appointment', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('אפשר להזיז את התור?')),
    { intent: 'appointment', mode: 'inform' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('תשלח ברכה ללקוחה')),
    { intent: 'messages', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('פתח תיק עבודות')),
    { intent: 'portfolio', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('האם הבוט עובד?')),
    { intent: 'status', mode: 'inform' }
  );
});

test('detects whether booking request is for self or for a client', () => {
  assert.equal(detectBookingRequestTarget('אני רוצה לקבוע תור'), 'self');
  assert.equal(detectBookingRequestTarget('תקבעי תור ללקוחה'), 'client');
  assert.equal(detectBookingRequestTarget('צריך לקבוע תור'), 'unclear');
});

test('keeps natural master and client phrases on the right product path', () => {
  assert.equal(
    detectBookingRequestTarget('\u05d0\u05e0\u05d9 \u05e8\u05d5\u05e6\u05d4 \u05dc\u05e7\u05d1\u05d5\u05e2 \u05ea\u05d5\u05e8 \u05dc\u05dc\u05e7\u05d5\u05d7\u05d4'),
    'client'
  );

  assert.deepEqual(
    pick(classifyConversationIntent('\u05ea\u05db\u05d9\u05df \u05d4\u05d5\u05d3\u05e2\u05ea \u05d9\u05d5\u05dd \u05d4\u05d5\u05dc\u05d3\u05ea')),
    { intent: 'messages', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('\u05db\u05de\u05d4 \u05e2\u05d5\u05dc\u05d4 \u05d8\u05d9\u05e4\u05d5\u05dc \u05e4\u05e0\u05d9\u05dd')),
    { intent: 'pricing', mode: 'inform' }
  );
});

test('understands broad beauty service requests beyond nails', () => {
  assert.deepEqual(
    pick(classifyConversationIntent('אני רוצה עיסוי')),
    { intent: 'services', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('אני רוצה לעשות גבות')),
    { intent: 'services', mode: 'act' }
  );

  assert.deepEqual(
    pick(classifyConversationIntent('כמה עולה איפור ערב?')),
    { intent: 'pricing', mode: 'inform' }
  );
});

const pick = (result: ReturnType<typeof classifyConversationIntent>) => ({
  intent: result.intent,
  mode: result.mode,
});
