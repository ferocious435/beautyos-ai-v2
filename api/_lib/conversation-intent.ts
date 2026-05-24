export type ConversationIntent =
  | 'appointment'
  | 'calendar'
  | 'services'
  | 'messages'
  | 'image_post'
  | 'pricing'
  | 'settings'
  | 'portfolio'
  | 'status'
  | 'smalltalk'
  | 'unknown';

export type ConversationMode = 'act' | 'inform' | 'clarify';

export interface ConversationIntentResult {
  intent: ConversationIntent;
  mode: ConversationMode;
  normalizedText: string;
}

const normalizeConversationText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[?!.,;:()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const ACTION_TERMS = [
  'קבע',
  'תקבע',
  'לקבוע לי',
  'תזמין',
  'הזמן',
  'פתח',
  'תפתח',
  'שלח',
  'תשלח',
  'צור',
  'תיצור',
  'תכין',
  'תעשה',
  'עשה',
  'עדכן',
  'תעדכן',
  'בטל',
  'תבטל',
  'אשר',
  'תאשר',
  'שנה',
  'תשנה',
  'נהל',
  'תנהל',
];

const INFO_TERMS = [
  'מה',
  'איך',
  'כמה',
  'אפשר',
  'יש',
  'ספר',
  'תסביר',
  'מה קורה',
  'רוצה לדעת',
  'מעניין',
  'בודק',
  'רק שואל',
  'רק בודקת',
  'רק בודק',
];

const INTENT_TERMS: Record<Exclude<ConversationIntent, 'smalltalk' | 'unknown'>, string[]> = {
  appointment: ['תור', 'לקבוע', 'קביעת', 'זמן', 'שעה', 'טיפול', 'booking', 'book'],
  calendar: ['יומן', 'לוח', 'לו"ז', 'לוז', 'calendar', 'schedule'],
  services: ['שירות', 'שירותים', 'טיפול', 'טיפולים', 'משך טיפול'],
  messages: ['הודעה', 'הודעות', 'ברכה', 'ברכות', 'תזכורת', 'לקוחה', 'לקוחות'],
  image_post: ['תמונה', 'תמונות', 'פוסט', 'סטורי', 'אינסטגרם', 'עיצוב', 'שיווק', 'ריטוש', 'שפר', 'תשפר', 'image', 'post'],
  pricing: ['מחירון', 'מחיר', 'מחירים', 'מנוי', 'תשלום', 'כמה עולה', 'pricing', 'price'],
  settings: ['הגדרות', 'עסק', 'כתובת', 'פרופיל', 'טלפון', 'settings'],
  portfolio: ['גלריה', 'פורטפוליו', 'עבודות', 'תיק עבודות', 'portfolio'],
  status: ['סטטוס', 'עובד', 'תקין', 'בעיה', 'באג', 'לא עובד', 'status'],
};

const SMALLTALK_TERMS = ['היי', 'שלום', 'בוקר טוב', 'ערב טוב', 'תודה', 'מה נשמע', 'hi', 'hello'];

const intentPriority: ConversationIntent[] = [
  'image_post',
  'appointment',
  'calendar',
  'messages',
  'pricing',
  'services',
  'settings',
  'portfolio',
  'status',
];

export const classifyConversationIntent = (text: string): ConversationIntentResult => {
  const normalizedText = normalizeConversationText(text);

  if (!normalizedText) {
    return { intent: 'unknown', mode: 'clarify', normalizedText };
  }

  const hasActionSignal = includesAny(normalizedText, ACTION_TERMS);
  const hasInfoSignal = includesAny(normalizedText, INFO_TERMS);

  let intent: ConversationIntent = 'unknown';
  for (const candidate of intentPriority) {
    if (candidate !== 'smalltalk' && candidate !== 'unknown' && includesAny(normalizedText, INTENT_TERMS[candidate])) {
      intent = candidate;
      break;
    }
  }

  if (intent === 'unknown' && includesAny(normalizedText, SMALLTALK_TERMS)) {
    intent = 'smalltalk';
  }

  const mode: ConversationMode = hasActionSignal && !hasInfoSignal ? 'act' : hasInfoSignal ? 'inform' : 'clarify';
  return { intent, mode, normalizedText };
};
