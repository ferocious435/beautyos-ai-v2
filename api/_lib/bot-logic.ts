 
 
import { Scenes, Context, Telegraf, Markup } from 'telegraf';
import { getSupabase, uploadToPortfolio } from './supabase.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { analyzeAndGenerate, enhanceImage } from './content-engine.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { enqueueAiProcessing, scheduleNotification } from './qstash.js';
import { CONFIG } from './config.js';
import { classifyConversationIntent, detectBookingRequestTarget } from './conversation-intent.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios from 'axios';

export interface BotContext extends Context {
  session: any;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

type BotRole = 'client' | 'master' | 'admin';

export const REGISTRATION_SCENE_ID = 'REGISTRATION_SCENE';

const roleTitles: Record<BotRole, string> = {
  client: '\u05dc\u05e7\u05d5\u05d7',
  master: '\u05de\u05d0\u05e1\u05d8\u05e8',
  admin: '\u05d0\u05d3\u05de\u05d9\u05df',
};

const roleHints: Record<BotRole, string> = {
  client: '\u05de\u05e7\u05d1\u05dc \u05e9\u05d9\u05e8\u05d5\u05ea',
  master: '\u05e0\u05d5\u05ea\u05df \u05e9\u05d9\u05e8\u05d5\u05ea',
  admin: '\u05e0\u05d9\u05d4\u05d5\u05dc \u05de\u05dc\u05d0',
};

const normalizeBotRole = (role?: string | null): BotRole => {
  if (role === 'master' || role === 'admin') {
    return role;
  }

  return 'client';
};

const getEffectiveBotRole = (actualRole?: string | null, previewRole?: string | null): BotRole => {
  const normalizedRole = normalizeBotRole(actualRole);
  if (
    normalizedRole === 'admin' &&
    (previewRole === 'client' || previewRole === 'master' || previewRole === 'admin')
  ) {
    return previewRole;
  }

  return normalizedRole;
};

const buildAdminVisibleMenuInlineKeyboard = (webAppUrl: string) =>
  Markup.inlineKeyboard([
    [
      Markup.button.callback('\u05d1\u05d3\u05d9\u05e7\u05d4 \u05db\u05dc\u05e7\u05d5\u05d7', 'preview_role_client'),
      Markup.button.callback('\u05d1\u05d3\u05d9\u05e7\u05d4 \u05db\u05de\u05d0\u05e1\u05d8\u05e8', 'preview_role_master'),
      Markup.button.callback('\u05d7\u05d6\u05e8\u05d4 \u05dc\u05d0\u05d3\u05de\u05d9\u05df', 'preview_role_admin'),
    ],
    [
      Markup.button.webApp('\u05e4\u05ea\u05d9\u05d7\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea', `${webAppUrl}/`),
      Markup.button.callback('\u05ea\u05de\u05d5\u05e0\u05ea \u05de\u05e6\u05d1', 'chat_admin_overview'),
    ],
  ]);

const buildRoleAwareReplyKeyboard = (webAppUrl: string, effectiveRole: BotRole, actualRole: BotRole) => {
  const rows: any[][] = [];

  if (actualRole === 'admin') {
    rows.push([
      Markup.button.text('בדיקת לקוח'),
      Markup.button.text('בדיקת מאסטר'),
      Markup.button.text('מצב אדמין'),
    ]);
  }

  if (effectiveRole === 'client') {
    rows.push([
      Markup.button.webApp('חיפוש מומחה וקביעת תור', `${webAppUrl}/discovery`),
    ]);
    rows.push([
      Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`),
    ]);
    return Markup.keyboard(rows).resize();
  }

  rows.push([
    Markup.button.webApp('פתח את הסטודיו', actualRole === 'admin' && effectiveRole === 'admin' ? `${webAppUrl}/?start=root` : `${webAppUrl}/`),
  ]);
  rows.push([
    Markup.button.webApp('ניהול יומן', `${webAppUrl}/calendar`),
    Markup.button.webApp('מינוי BeautyOS', `${webAppUrl}/pricing`),
  ]);
  rows.push([
    Markup.button.webApp('הודעות וברכות', `${webAppUrl}/messages`),
    Markup.button.webApp('שירותים ומחירים', `${webAppUrl}/settings`),
  ]);

  return Markup.keyboard(rows).resize();
};

const sendRoleAwareMainMenu = async (
  ctx: BotContext,
  actualRole: BotRole,
  message: string,
  previewRole?: string | null
) => {
  const webAppUrl = getWebAppUrl();
  const effectiveRole = getEffectiveBotRole(actualRole, previewRole);

  await ctx.reply(message, buildRoleAwareReplyKeyboard(webAppUrl, effectiveRole, actualRole));

  if (actualRole === 'admin') {
    await ctx.reply(
      `\u05de\u05e6\u05d1 \u05e6\u05e4\u05d9\u05d9\u05d4 \u05e0\u05d5\u05db\u05d7\u05d9: ${roleTitles[effectiveRole]} - ${roleHints[effectiveRole]}\n\u05d1\u05d7\u05e8 \u05db\u05d0\u05df \u05d0\u05d9\u05da \u05dc\u05e8\u05d0\u05d5\u05ea \u05d0\u05ea \u05d4\u05de\u05e2\u05e8\u05db\u05ea:`,
      buildAdminVisibleMenuInlineKeyboard(webAppUrl)
    );
  }
};

const isPrivilegedTelegramUser = (telegramId?: number) => {
  if (!telegramId) return false;
  return (process.env.BOT_ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(String(telegramId));
};

const activeBookingStatuses = ['pending', 'confirmed'];
const clientCancelTerms = ['בטל', 'לבטל', 'ביטול', 'למחוק את התור'];
const clientRescheduleTerms = [
  'הזז',
  'להזיז',
  'תזיז',
  'תזיזי',
  'העבר',
  'להעביר',
  'תעביר',
  'לדחות',
  'דחה',
  'להקדים',
  'הקדם',
  'להחליף שעה',
  'לשנות שעה',
  'לשנות את התור',
  'להזיז את התור',
  'להעביר את התור',
];

const includesAnyPhrase = (text: string, phrases: string[]) => phrases.some((phrase) => text.includes(phrase));

const getWebAppUrl = () => (process.env.WEBAPP_URL || '').replace(/\/$/, '');

const setPersistentMenuButton = async (ctx: BotContext, path = '/') => {
  const webAppUrl = getWebAppUrl();
  if (!webAppUrl) return;

  const url = `${webAppUrl}${path.startsWith('/') ? path : `/${path}`}`;
  await ctx.setChatMenuButton({
    type: 'web_app',
    text: 'BeautyOS',
    web_app: { url },
  }).catch((err) => {
    console.warn('[Bot] Failed to set chat menu button:', err instanceof Error ? err.message : err);
  });
};

const safeBotTelegramSend = async (label: string, send: () => Promise<unknown>) => {
  try {
    await send();
  } catch (err) {
    console.warn(`[Bot] Telegram notification failed (${label}):`, err instanceof Error ? err.message : err);
  }
};

const hasBookingOverlap = async (
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  masterId: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
) => {
  let query = supabase
    .from('bookings')
    .select('id')
    .eq('master_id', masterId)
    .in('status', activeBookingStatuses)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1);

  if (excludeBookingId) query = query.neq('id', excludeBookingId);

  const { data, error } = await query;
  if (error) throw error;
  return Boolean(data?.length);
};

const scheduleBookingReminders = async (booking: any) => {
  const now = Date.now();
  const start = new Date(booking.start_time).getTime();

  const delay24h = (start - (24 * 60 * 60 * 1000) - now) / 1000;
  if (delay24h > 0 && !booking.notified_24h) {
    await safeBotTelegramSend('schedule-24h-reminder', () =>
      scheduleNotification(Math.floor(delay24h), '24h', booking.id)
    );
  }

  const delay3h = (start - (3 * 60 * 60 * 1000) - now) / 1000;
  if (delay3h > 0 && !booking.notified_3h) {
    await safeBotTelegramSend('schedule-3h-reminder', () =>
      scheduleNotification(Math.floor(delay3h), '3h', booking.id)
    );
  }
};

const formatChatDateTime = (value: string) =>
  new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const getChatTemplateDraft = (templateType: string, businessName = 'BeautyOS') => {
  const templates: Record<string, { title: string; text: string }> = {
    birthday: {
      title: 'ברכת יום הולדת',
      text: `מזל טוב אהובה! מאחלת לך שנה מלאה ביופי, ביטחון ורגעים טובים. ${businessName} מחכה לפנק אותך בטיפול הבא.`,
    },
    reminder: {
      title: 'תזכורת עדינה לתור',
      text: `היי, מזכירה בעדינות שהתור שלך מתקרב. אם צריך שינוי קטן בשעה, כתבי לי כאן ואעזור בשמחה. ${businessName}`,
    },
    promo: {
      title: 'הודעת מבצע שקטה',
      text: `חשבתי עלייך. השבוע יש לי חלון קטן למבצע מיוחד ללקוחות חוזרות. רוצה שאשמור לך מקום? ${businessName}`,
    },
    aftercare: {
      title: 'הודעה אחרי טיפול',
      text: `תודה שבאת היום. היה לי כיף לטפל בך. אם אהבת את התוצאה, אשמח שתשלחי תמונה או המלצה קטנה. ${businessName}`,
    },
  };

  return templates[templateType] || templates.reminder!;
};

const getRoleProfile = async (
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  telegramId?: number
) => {
  if (!telegramId) return null;
  const { data } = await supabase
    .from('users')
    .select('id, telegram_id, role, full_name, business_name')
    .eq('telegram_id', telegramId)
    .single();
  return data || null;
};

const sendBookingStartFromChat = async (ctx: BotContext, webAppUrl: string) => {
  const supabase = getSupabase();
  if (!supabase) {
    await ctx.reply(
      'אפשר להתחיל קביעת תור דרך רשימת המומחים.',
      Markup.inlineKeyboard([[Markup.button.webApp('חיפוש מומחה וקביעת תור', `${webAppUrl}/discovery`)]])
    );
    return;
  }

  const { data: masters } = await supabase
    .from('users')
    .select('id, telegram_id, full_name, business_name')
    .eq('role', 'master')
    .order('created_at', { ascending: false })
    .limit(20);

  const masterIds = (masters || []).map((master: any) => master.id);
  const { data: activeServices } = masterIds.length
    ? await supabase
      .from('services')
      .select('master_id')
      .in('master_id', masterIds)
      .eq('is_active', true)
    : { data: [] };

  const enabledMasterIds = new Set((activeServices || []).map((service: any) => service.master_id));
  const bookableMasters = (masters || [])
    .filter((master: any) => enabledMasterIds.has(master.id) && master.telegram_id)
    .slice(0, 5);

  if (!bookableMasters.length) {
    await ctx.reply(
      'כרגע לא מצאתי מומחים עם שירותים פעילים. אפשר לפתוח את החיפוש ולבדוק שוב.',
      Markup.inlineKeyboard([[Markup.button.webApp('חיפוש מומחה', `${webAppUrl}/discovery`)]])
    );
    return;
  }

  await ctx.reply(
    'אפשר להתחיל מכאן. בחרי מומחה, ואז ייפתח מסך בחירת טיפול ושעה פנויה.',
    Markup.inlineKeyboard([
      ...bookableMasters.map((master: any) => [
        Markup.button.webApp(
          master.business_name || master.full_name || 'בחירת מומחה',
          `${webAppUrl}/booking?masterId=${master.telegram_id}`
        ),
      ]),
      [Markup.button.webApp('לכל המומחים', `${webAppUrl}/discovery`)],
    ])
  );
};

const sendManagerCalendarStartFromChat = async (ctx: BotContext, webAppUrl: string) => {
  const supabase = getSupabase();
  const fallback = Markup.inlineKeyboard([[Markup.button.webApp('פתחי יומן', `${webAppUrl}/calendar`)]]);
  if (!supabase) {
    await ctx.reply('פתחתי לך כיוון ליומן. שם אפשר לראות, לאשר ולשנות תורים.', fallback);
    return;
  }

  const profile = await getRoleProfile(supabase, ctx.from?.id);
  if (!profile) {
    await ctx.reply('לא מצאתי פרופיל מחובר, אז עדיף לפתוח את היומן מהכפתור.', fallback);
    return;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, start_time, client:client_id(full_name)')
    .eq('master_id', profile.id)
    .in('status', activeBookingStatuses)
    .gte('start_time', start.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time', { ascending: true });

  const pending = (bookings || []).filter((booking: any) => booking.status === 'pending').length;
  const confirmed = (bookings || []).filter((booking: any) => booking.status === 'confirmed').length;
  const nextItems = (bookings || [])
    .slice(0, 3)
    .map((booking: any) => `• ${formatChatDateTime(booking.start_time)} - ${booking.client?.full_name || 'לקוחה'}`)
    .join('\n');

  await ctx.reply(
    nextItems
      ? `בדקתי את היומן שלך להיום. יש ${confirmed} תורים מאושרים ו-${pending} שממתינים לאישור.\n\nהבאים בתור:\n${nextItems}`
      : 'בדקתי את היומן שלך. כרגע אין תורים להמשך היום.',
    Markup.inlineKeyboard([
      [Markup.button.webApp('פתחי יומן', `${webAppUrl}/calendar`)],
      [Markup.button.webApp('קביעת תור כמטופלת', `${webAppUrl}/discovery`)],
    ])
  );
};

const sendAdminSystemOverviewFromChat = async (ctx: BotContext, webAppUrl: string) => {
  const supabase = getSupabase();
  const fallback = Markup.inlineKeyboard([
    [Markup.button.webApp('פתיחת המערכת', `${webAppUrl}/`)],
    [Markup.button.callback('בדיקה כלקוח', 'preview_role_client'), Markup.button.callback('בדיקה כמאסטר', 'preview_role_master')],
  ]);

  if (!supabase) {
    await ctx.reply('מצב אדמין פעיל. אפשר לפתוח את המערכת או לבחור מצב בדיקה.', fallback);
    return;
  }

  const profile = await getRoleProfile(supabase, ctx.from?.id);
  if (profile?.role !== 'admin' || !isPrivilegedTelegramUser(ctx.from?.id)) {
    await ctx.reply('האפשרות הזו זמינה רק לאדמין.', fallback);
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { data: users },
    { data: services },
    { data: todayBookings },
    { data: nextBookings },
  ] = await Promise.all([
    supabase.from('users').select('id, role'),
    supabase.from('services').select('id, is_active'),
    supabase
      .from('bookings')
      .select('id, status')
      .in('status', activeBookingStatuses)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString()),
    supabase
      .from('bookings')
      .select('id, status, start_time, client:client_id(full_name), master:master_id(full_name, business_name)')
      .in('status', activeBookingStatuses)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
  ]);

  const clients = (users || []).filter((user: any) => user.role === 'client').length;
  const masters = (users || []).filter((user: any) => user.role === 'master').length;
  const admins = (users || []).filter((user: any) => user.role === 'admin').length;
  const activeServices = (services || []).filter((service: any) => service.is_active).length;
  const pendingToday = (todayBookings || []).filter((booking: any) => booking.status === 'pending').length;
  const confirmedToday = (todayBookings || []).filter((booking: any) => booking.status === 'confirmed').length;
  const nextLines = (nextBookings || [])
    .map((booking: any) => {
      const master = booking.master?.business_name || booking.master?.full_name || 'מאסטר';
      const client = booking.client?.full_name || 'לקוח';
      return `• ${formatChatDateTime(booking.start_time)} - ${client} אצל ${master}`;
    })
    .join('\n');

  await ctx.reply(
    `מצב אדמין פעיל.\n\nתמונה קצרה של המערכת:\nלקוחות: ${clients}\nמאסטרים: ${masters}\nאדמינים: ${admins}\nשירותים פעילים: ${activeServices}\nהיום: ${confirmedToday} מאושרים, ${pendingToday} ממתינים.\n\n${nextLines ? `התורים הקרובים:\n${nextLines}` : 'אין תורים קרובים להצגה כרגע.'}`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('פתיחת המערכת', `${webAppUrl}/`)],
      [Markup.button.webApp('יומן המערכת', `${webAppUrl}/calendar`), Markup.button.webApp('מינוי BeautyOS', `${webAppUrl}/pricing`)],
      [Markup.button.callback('בדיקה כלקוח', 'preview_role_client'), Markup.button.callback('בדיקה כמאסטר', 'preview_role_master')],
    ])
  );
};

const sendAdminAppointmentChoiceFromChat = async (ctx: BotContext, webAppUrl: string) => {
  await ctx.reply(
    'באיזה כיוון לבדוק את זה?\n\nכלקוח: לראות איך אדם מזמין תור לעצמו.\nכמאסטר: לראות איך נותן שירות מנהל תורים של לקוחות.',
    Markup.inlineKeyboard([
      [Markup.button.callback('בדיקה כלקוח', 'preview_role_client'), Markup.button.webApp('פתיחת קביעת תור', `${webAppUrl}/discovery`)],
      [Markup.button.callback('בדיקה כמאסטר', 'preview_role_master'), Markup.button.webApp('ניהול יומן', `${webAppUrl}/calendar`)],
    ])
  );
};

const sendManagerAppointmentReply = async (ctx: BotContext, webAppUrl: string, text: string) => {
  const bookingTarget = detectBookingRequestTarget(text);

  if (bookingTarget === 'self') {
    await ctx.reply('בשמחה. אם את רוצה לקבוע תור לעצמך, נתחיל מבחירת מומחה ואז תבחרי טיפול ושעה.');
    await sendBookingStartFromChat(ctx, webAppUrl);
    return;
  }

  if (bookingTarget === 'client') {
    await ctx.reply(
      'ברור. אם זה תור ללקוחה, הכי נכון לפתוח את היומן כדי לראות שעה פנויה ולעדכן הכל במקום אחד.',
      Markup.inlineKeyboard([
        [Markup.button.webApp('פתחי יומן', `${webAppUrl}/calendar`)],
        [Markup.button.webApp('אם התכוונת לעצמך', `${webAppUrl}/discovery`)],
      ])
    );
    return;
  }

  await ctx.reply(
    'בשמחה. רק כדי לא לקחת אותך למסך הלא נכון: את רוצה לקבוע תור לעצמך או לנהל תור של לקוחה?',
    Markup.inlineKeyboard([
      [Markup.button.webApp('תור לעצמי', `${webAppUrl}/discovery`)],
      [Markup.button.webApp('תור ללקוחה', `${webAppUrl}/calendar`)],
    ])
  );
};

const sendManagerServicesStartFromChat = async (ctx: BotContext, webAppUrl: string) => {
  const supabase = getSupabase();
  const keyboard = Markup.inlineKeyboard([[Markup.button.webApp('עריכת שירותים ומחירים', `${webAppUrl}/settings`)]]);
  if (!supabase) {
    await ctx.reply('אפשר לערוך שירותים, מחירים ומשך טיפול דרך ההגדרות.', keyboard);
    return;
  }

  const profile = await getRoleProfile(supabase, ctx.from?.id);
  if (!profile) {
    await ctx.reply('לא מצאתי פרופיל מחובר. פתחי את ההגדרות כדי לבדוק את השירותים.', keyboard);
    return;
  }

  const { data: services } = await supabase
    .from('services')
    .select('name, price, duration_mins, is_active')
    .eq('master_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const lines = (services || [])
    .map((service: any) => `• ${service.name} - ${service.price}₪, ${service.duration_mins} דק׳${service.is_active ? '' : ' (כבוי)'}`)
    .join('\n');

  await ctx.reply(
    lines
      ? `אלה השירותים שמצאתי:\n${lines}\n\nכדי לשנות מחיר, שם או משך טיפול - פתחי הגדרות.`
      : 'עדיין לא מצאתי שירותים פעילים. כדאי להוסיף לפחות שירות אחד כדי שלקוחות יוכלו לקבוע תור.',
    keyboard
  );
};

const sendTemplateMenuFromChat = async (ctx: BotContext, webAppUrl: string) => {
  await ctx.reply(
    'איזו הודעה להכין? אני אייצר טיוטה כאן בצ׳אט, ולא אשלח אותה לאף לקוחה בלי אישור שלך.',
    Markup.inlineKeyboard([
      [Markup.button.callback('ברכת יום הולדת', 'chat_template_birthday')],
      [Markup.button.callback('תזכורת לתור', 'chat_template_reminder')],
      [Markup.button.callback('מבצע ללקוחות', 'chat_template_promo')],
      [Markup.button.callback('אחרי טיפול', 'chat_template_aftercare')],
      [Markup.button.webApp('מרכז הודעות מלא', `${webAppUrl}/messages`)],
    ])
  );
};

const sendClientBookingsStartFromChat = async (ctx: BotContext, webAppUrl: string) => {
  const supabase = getSupabase();
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
    [Markup.button.webApp('קביעת תור חדש', `${webAppUrl}/discovery`)],
  ]);

  if (!supabase) {
    await ctx.reply('אפשר לראות את התורים שלך במסך התורים.', keyboard);
    return;
  }

  const profile = await getRoleProfile(supabase, ctx.from?.id);
  if (!profile) {
    await ctx.reply('לא מצאתי פרופיל מחובר. אפשר לפתוח את מסך התורים ולבדוק משם.', keyboard);
    return;
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, start_time, master:master_id(full_name, business_name)')
    .eq('client_id', profile.id)
    .in('status', activeBookingStatuses)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3);

  const lines = (bookings || [])
    .map((booking: any) => `• ${formatChatDateTime(booking.start_time)} - ${booking.master?.business_name || booking.master?.full_name || 'מומחה'} (${booking.status === 'pending' ? 'ממתין' : 'מאושר'})`)
    .join('\n');

  await ctx.reply(
    lines ? `התורים הקרובים שלך:\n${lines}` : 'לא מצאתי תורים קרובים. אפשר לקבוע תור חדש מכאן.',
    keyboard
  );
};

// --- Session Middleware (Supabase Stateless) ---
export async function supabaseSessionMiddleware(ctx: any, next: () => Promise<void>) {
  const supabase = getSupabase();
  if (!supabase || !ctx.from?.id) {
    ctx.session = ctx.session || {};
    return next();
  }

  const userId = ctx.from.id;
  
  try {
    const { data, error: sErr } = await supabase
      .from('bot_sessions')
      .select('session_data')
      .eq('user_id', userId)
      .single();

    if (sErr && sErr.code !== 'PGRST116') { // PGRST116 is "No rows returned" - which is fine
        console.error('SUPABASE_SESSION_READ:', sErr);
    }
    
    ctx.session = data?.session_data || {};
    
    // 🔥 FORCE SYNC on actions known to need latest database session
    if (ctx.callbackQuery && ('data' in ctx.callbackQuery)) {
        const query = ctx.callbackQuery.data;
        if (query.startsWith('design_') || query.startsWith('fmt_') || query.startsWith('star_pf_')) {
          console.log('[Middleware] Ensuring fresh session for action:', query);
          // Already fetched above, so this is current.
        }
    }

    await next();

    // Persist session back to DB
    await supabase
      .from('bot_sessions')
      .upsert({ 
        user_id: userId, 
        session_data: ctx.session,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('SESSION_MIDDLEWARE_CRASH:', err);
    ctx.session = ctx.session || {};
    await next();
  }
}


// --- Registration Wizard ---
export const registrationWizard = new Scenes.WizardScene<BotContext>(
  REGISTRATION_SCENE_ID,
  async (ctx) => {
    await ctx.reply('✨ ברוכים הבאים ל-BeautyOS AI v2! ✨\nבואו נגדיר את הפרופיל שלכם. מי אתם?', 
      Markup.inlineKeyboard([
        [Markup.button.callback('אני מאסטר - נותן/ת שירות', 'set_role_master')],
        [Markup.button.callback('אני לקוח/ה - מקבל/ת שירות', 'set_role_client')]
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Process Callback
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const role = ctx.callbackQuery.data === 'set_role_master' ? 'master' : 'client';
      (ctx.wizard.state as any).role = role;
      await ctx.answerCbQuery();
      await ctx.reply(`מעולה. בחרתם ${role === 'master' ? 'מאסטר' : 'לקוח'}. איך קוראים לכם?`);
      return ctx.wizard.next();
    }
    return ctx.reply('נא לבחור תפקיד מהכפתורים למעלה.');
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין שם.');
    (ctx.wizard.state as any).name = ctx.message.text;
    await ctx.reply('מעולה! מה שם העסק שלכם? (למשל: "הסטודיו של שרה")');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין שם עסק.');
    (ctx.wizard.state as any).businessName = ctx.message.text;
    await ctx.reply('מה מספר הטלפון שלכם ליצירת קשר?');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין מספר טלפון.');
    (ctx.wizard.state as any).phone = ctx.message.text;
    await ctx.reply('📍 **מיקום העסק:**\nלחצו על הכפתור למטה כדי לשלוח מיקום, או כתבו את הכתובת המדויקת שלכם בטקסט.', 
      Markup.keyboard([
        [Markup.button.locationRequest('📍 שלח מיקום'), Markup.button.text('דילוג')]
      ]).oneTime().resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const { name, businessName, phone, role } = ctx.wizard.state as any;
    const telegramId = ctx.from?.id;
    let lat: number | null = null;
    let lng: number | null = null;
    let address: string | null = null;

    if (ctx.message && 'location' in ctx.message) {
      lat = ctx.message.location.latitude;
      lng = ctx.message.location.longitude;
    } else if (ctx.message && 'text' in ctx.message && ctx.message.text !== 'דילוג') {
      address = ctx.message.text;
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .upsert({ 
          telegram_id: Number(telegramId),
          full_name: name,
          business_name: businessName,
          phone: phone,
          latitude: lat,
          longitude: lng,
          address: address,
          role: role || 'master',
        }, { onConflict: 'telegram_id' });

      if (error) {
        console.error('Update error:', error);
        await ctx.reply('חלה שגיאה בשמירת הנתונים.');
      } else {
        await ctx.reply('🙏 תודה על ההרשמה! הצוות יחזור אליך בקרוב.');
      }
    }
    return ctx.scene.leave();
  }
);

// --- Photo Processor & AI Logic ---
export function setupBotHandlers(bot: Telegraf<BotContext>) {
  const stage = new Scenes.Stage<BotContext>([registrationWizard]);
  bot.use(stage.middleware());

  // Error Handling
  bot.catch((err: any, ctx) => {
    console.error(`Telegraf error for ${ctx.updateType}`, err);
    ctx.reply('⚠️ חלה שגיאה במערכת. אנחנו כבר מטפלים בזה!');
  });

  // Start command
  bot.start(async (ctx) => {
    await setPersistentMenuButton(ctx, '/');

    // 🧹 Refresh UI
    try {
      const clearMsg = await ctx.reply('מעדכן ממשק...', Markup.removeKeyboard());
      await ctx.deleteMessage(clearMsg.message_id);
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) { /* ignore */ }

    const name = ctx.from?.first_name || 'חברת BeautyOS';
    const payload = (ctx.message as any).text.split(' ')[1]; // Payload: /start <payload>

    const supabase = getSupabase();

    // MAGIC ADMIN BYPASS (Zero-Click Registration for Owner)
    if (payload === 'root' || payload === 'admin') {
      if (!isPrivilegedTelegramUser(ctx.from?.id)) {
        return ctx.reply('אין הרשאה לפתוח מצב מנהל מהחשבון הזה.');
      }

      if (supabase && ctx.from) {
        // Silent admin registration
        await supabase.from('users').upsert({
          telegram_id: ctx.from.id,
          full_name: name,
          role: 'admin',
          business_name: 'BeautyOS Core Admin',
          phone: '+00000000',
          address: 'System'
        }, { onConflict: 'telegram_id' });
      }
      ctx.session.previewRole = 'admin';
      await sendRoleAwareMainMenu(
        ctx,
        'admin',
        `ברוך שובך, ${name}.\nיש לך ניהול מלא, ועכשיו אפשר גם לבדוק את המערכת כמו לקוח או כמו מאסטר בלי לשנות את ההרשאות האמיתיות שלך.`,
        ctx.session.previewRole
      );
      return;
      
      const webAppUrl = getWebAppUrl();
      const adminMenu = Markup.keyboard([
        [Markup.button.webApp('🚀 פתח הכל ב-Studio', `${webAppUrl}/`)],
        [Markup.button.webApp('🗓️ ניהול יומן', `${webAppUrl}/calendar`), Markup.button.webApp('💳 מחירון', `${webAppUrl}/pricing`)],
        [Markup.button.webApp('💬 הודעות וברכות', `${webAppUrl}/messages`), Markup.button.webApp('⚙️ הגדרות', `${webAppUrl}/settings`)]
      ]).resize();

      await ctx.reply(`🏰 **ברוך שובך, מנהל המערכת (${name})!**\n\nקיבלת הרשאות Admin מלאה.\n💡 *הערה: כל כלי ה-AI (שיפור תמונות, פוסטים) עובדים ישירות כאן בצ'אט (פשוט שלח/י תמונה). כל פונקציות המערכת פתוחות עבורך ב-Mini App.*`, adminMenu);
      return;
    } else {
      // 🛍 REGULAR USER FLOW
      await ctx.reply(`✨ **ברוכים הבאים ל-BeautyOS AI v2!** ✨\n\nהיי ${name}, המערכת מזהה אותך.\n💡 *יצירת פוסטים ושיפור תמונות מתבצעים ישירות כאן בצ'אט - פשוט שלח/י ויזואליה!*`, 
        Markup.inlineKeyboard([
          [Markup.button.webApp('🗓️ יומן והזמנת תורים', `${getWebAppUrl()}/`)],
          [Markup.button.callback('📝 הרשמה למערכת', 'register_request')]
        ])
      );
    }

    // 📱 Persistent Role-Aware Reply Menu (v2.3)
    let actualRole: BotRole = 'client';
    if (supabase && ctx.from?.id) {
      const { data: dbUser } = await supabase.from('users').select('role').eq('telegram_id', ctx.from.id).single();
      actualRole = normalizeBotRole(dbUser?.role);
    }

    await sendRoleAwareMainMenu(
      ctx,
      actualRole,
      actualRole === 'client'
        ? 'התפריט מוכן. אפשר לדבר איתי רגיל, או לפתוח את המסך המתאים מהכפתורים.'
        : 'התפריט עודכן. אפשר להמשיך מכאן דרך הצ׳אט או לפתוח את המסך המתאים.',
      ctx.session?.previewRole
    );
    return;

    const webAppUrl = getWebAppUrl();
    
    // Fetch latest role for keyboard selection
    let userRole = 'client';
    const { data: dbUser } = await supabase.from('users').select('role').eq('telegram_id', ctx.from?.id).single();
    if (dbUser) userRole = dbUser.role;

    let kb: any[];
    
    if (userRole === 'admin' || userRole === 'master') {
      kb = [
        [{ text: '🚀 פתח הכל ב-Studio', web_app: { url: `${webAppUrl}/?start=root` } }],
        [{ text: '🗓️ ניהול יומן', web_app: { url: `${webAppUrl}/calendar` } }, { text: '💳 מחירון', web_app: { url: `${webAppUrl}/pricing` } }],
        [{ text: '💬 הודעות וברכות', web_app: { url: `${webAppUrl}/messages` } }, { text: '⚙️ הגדרות', web_app: { url: `${webAppUrl}/settings` } }]
      ];
    } else {
      kb = [
        [{ text: '🔍 חיפוש מומחה וקביעת תור', web_app: { url: `${webAppUrl}/discovery` } }],
        [{ text: '🗓️ התורים שלי', web_app: { url: `${webAppUrl}/calendar` } }, { text: '💳 מחירון', web_app: { url: `${webAppUrl}/pricing` } }],
        [{ text: '💬 הודעות וברכות', web_app: { url: `${webAppUrl}/messages` } }, { text: '⚙️ הגדרות', web_app: { url: `${webAppUrl}/settings` } }]
      ];
    }
    
    await ctx.reply('תפריט הניווט הראשי עודכן 👇', Markup.keyboard(kb).resize());
  });

  bot.action('register_request', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  // Command handlers
  bot.command('register', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));
  bot.command('id', async (ctx) => {
    await ctx.reply(`מזהה Telegram שלך: ${ctx.from?.id || 'לא ידוע'}\nאם זה חשבון מנהל, צריך להוסיף את המזהה לרשימת המנהלים ואז לשלוח /start admin.`);
  });
  bot.hears('📝 הרשמה', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  const previewRoleTexts: Record<string, BotRole> = {
    'בדיקת לקוח': 'client',
    'בדיקת מאסטר': 'master',
    'מצב אדמין': 'admin',
  };

  const applyAdminPreviewRole = async (ctx: BotContext, role: BotRole) => {
    const supabase = getSupabase();
    let actualRole: BotRole = 'client';

    if (supabase && ctx.from?.id) {
      const { data: dbUser } = await supabase.from('users').select('role').eq('telegram_id', ctx.from.id).single();
      actualRole = normalizeBotRole(dbUser?.role);
    }

    if (actualRole !== 'admin' || !isPrivilegedTelegramUser(ctx.from?.id)) {
      await ctx.reply('האפשרות הזו זמינה רק לאדמין.');
      return;
    }

    ctx.session.previewRole = role;
    await sendRoleAwareMainMenu(
      ctx,
      'admin',
      role === 'admin'
        ? 'חזרת למצב אדמין מלא.'
        : `מעכשיו אני מציג לך את המערכת כמו ${roleTitles[role]} - ${roleHints[role]}.`,
      ctx.session.previewRole
    );
  };

  bot.command('mode', async (ctx) => {
    await applyAdminPreviewRole(ctx, getEffectiveBotRole('admin', ctx.session?.previewRole));
  });

  bot.hears(['תפריט', 'menu', 'Menu'], async (ctx) => {
    const supabase = getSupabase();
    let actualRole: BotRole = 'client';

    if (supabase && ctx.from?.id) {
      const { data: dbUser } = await supabase.from('users').select('role').eq('telegram_id', ctx.from.id).single();
      actualRole = normalizeBotRole(dbUser?.role);
    }

    await sendRoleAwareMainMenu(
      ctx,
      actualRole,
      'החזרתי את התפריט למסך.',
      ctx.session?.previewRole
    );
  });

  bot.hears(Object.keys(previewRoleTexts), async (ctx) => {
    await applyAdminPreviewRole(ctx, previewRoleTexts[ctx.message.text]);
  });

  (['client', 'master', 'admin'] as BotRole[]).forEach((role) => {
    bot.action(`preview_role_${role}`, async (ctx) => {
      await ctx.answerCbQuery();
      await applyAdminPreviewRole(ctx, role);
    });
  });

  bot.command('role', async (ctx) => {
    if (!isPrivilegedTelegramUser(ctx.from?.id)) {
      return ctx.reply('אין הרשאה לשנות תפקיד מהחשבון הזה.');
    }

    const role = (ctx.message as any).text.split(' ')[1];
    if (!['master', 'client', 'admin'].includes(role)) {
      return ctx.reply('כדי לשנות תפקיד כתבו: /role master או /role client או /role admin');
    }

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('users').update({ role }).eq('telegram_id', ctx.from.id);
      await ctx.reply(`✅ תפקידך שונה ל: **${role}**\nפתח את המיני-אפ מחדש לרענון.`, { parse_mode: 'Markdown' });
    }
  });

  bot.command('status', async (ctx) => {
    const supabase = getSupabase();
    let dbStatus = '❌ Offline';
    if (supabase) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await supabase.from('users').select('id').limit(1);
      if (!error) dbStatus = '✅ Connected';
    }

    await ctx.reply(`🛡️ **BeautyOS AI System Status**\n\n` +
      `🏠 **Backend:** Vercel Stateless\n` +
      `🗄️ **Database:** ${dbStatus}\n` +
      `🧠 **AI Analysis:** ${CONFIG.MODELS.ANALYSIS}\n` +
      `🪄 **AI Enhancement:** ${CONFIG.MODELS.ENHANCEMENT}\n` +
      `📦 **Environment:** Production`, 
      { parse_mode: 'Markdown' }
    );
  });

  // Fast Role Switch Callbacks
  const fastRoles = ['master', 'client', 'admin'];
  fastRoles.forEach(role => {
    bot.action(`set_fast_role_${role}`, async (ctx) => {
      if (role === 'admin' && !isPrivilegedTelegramUser(ctx.from?.id)) {
        await ctx.answerCbQuery('אין הרשאה לשנות תפקיד.');
        return;
      }

      const supabase = getSupabase();
      if (supabase && ctx.from) {
        await supabase.from('users').update({ role }).eq('telegram_id', ctx.from.id);
        await ctx.answerCbQuery('התפקיד עודכן');
        await ctx.reply(`✅ תפקידך שונה ל: **${role}**.\nפתח את ה-Studio מחדש.`);
      }
    });
  });
  
  // --- BOOKING ACTIONS (v34.1) ---
  bot.action(/^approve_(.*)/, async (ctx) => {
    const bookingId = ctx.match[1];
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: pendingBooking, error: readErr } = await supabase
        .from('bookings')
        .select('*, client:client_id(telegram_id, full_name), master:master_id(telegram_id, business_name, full_name)')
        .eq('id', bookingId)
        .single();

      if (readErr) throw readErr;
      if (Number(pendingBooking.master.telegram_id) !== Number(ctx.from?.id)) {
        await ctx.answerCbQuery('אין הרשאה לבצע פעולה על התור הזה.');
        return;
      }
      if (pendingBooking.status !== 'pending') {
        await ctx.answerCbQuery('התור הזה כבר לא ממתין לאישור.');
        return;
      }
      const overlaps = await hasBookingOverlap(
        supabase,
        pendingBooking.master_id,
        pendingBooking.start_time,
        pendingBooking.end_time,
        pendingBooking.id
      );
      if (overlaps) {
        await ctx.answerCbQuery('השעה הזו כבר לא פנויה.');
        return;
      }

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)
        .eq('status', 'pending')
        .select('*, client:client_id(telegram_id, full_name), master:master_id(telegram_id, business_name, full_name)')
        .single();

      if (bErr) throw bErr;

      await ctx.answerCbQuery('✅ התור אושר בהצלחה!');
      await ctx.editMessageCaption(`${ctx.callbackQuery.message && 'caption' in ctx.callbackQuery.message ? ctx.callbackQuery.message.caption : ''}\n\n✅ **התור אושר! הודעה נשלחה ללקוח.**`);

      // Notify Client
      const clientMsg = `✨ **חדשות טובות!**\nהתור שלך ב-${booking.master.business_name || booking.master.full_name} אושר! 🎉\nמחכים לראות אותך!`;
      await safeBotTelegramSend('approve-client-notification', () =>
        ctx.telegram.sendMessage(booking.client.telegram_id, clientMsg)
      );
      await scheduleBookingReminders(booking);

    } catch (err: any) {
      console.error('APPROVE_ERR:', err);
      await ctx.answerCbQuery('❌ שגיאה באישור התור.');
    }
  });

  bot.action(/^reject_(.*)/, async (ctx) => {
    const bookingId = ctx.match[1];
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: pendingBooking, error: readErr } = await supabase
        .from('bookings')
        .select('*, client:client_id(telegram_id), master:master_id(telegram_id)')
        .eq('id', bookingId)
        .single();

      if (readErr) throw readErr;
      if (Number(pendingBooking.master.telegram_id) !== Number(ctx.from?.id)) {
        await ctx.answerCbQuery('אין הרשאה לבצע פעולה על התור הזה.');
        return;
      }
      if (pendingBooking.status !== 'pending') {
        await ctx.answerCbQuery('התור הזה כבר לא ממתין לאישור.');
        return;
      }

      const { data: booking, error: bErr } = await supabase
        .from('bookings')
        .update({ status: 'cancelled_by_master', notified_24h: false, notified_3h: false })
        .eq('id', bookingId)
        .eq('status', 'pending')
        .select('*, client:client_id(telegram_id)')
        .single();

      if (bErr) throw bErr;

      await ctx.answerCbQuery('❌ התור בוטל.');
      await ctx.editMessageCaption(`${ctx.callbackQuery.message && 'caption' in ctx.callbackQuery.message ? ctx.callbackQuery.message.caption : ''}\n\n❌ **התור בוטל.**`);

      // Notify Client
      const clientMsg = `😔 **עדכון לגבי התור:**\nלצערנו המאסטר לא יוכל לקבל אותך בשעה המבוקשת. נסה/י לקבוע מועד אחר ב-Studio.`;
      await safeBotTelegramSend('reject-client-notification', () =>
        ctx.telegram.sendMessage(booking.client.telegram_id, clientMsg)
      );

    } catch (err: any) {
      console.error('REJECT_ERR:', err);
      await ctx.answerCbQuery('❌ שגיאה בביטול התור.');
    }
  });



  bot.hears('📜 תנאי שימוש', (ctx) => {
    ctx.reply('💄 **BeautyOS AI v2**\nכל הזכויות שמורות. מופעל באמצעות בינה מלאכותית מתקדמת.');
  });

  bot.action('chat_booking_start', async (ctx) => {
    await ctx.answerCbQuery('פותח אפשרויות לקביעת תור');
    await sendBookingStartFromChat(ctx, getWebAppUrl());
  });

  bot.action('chat_calendar_start', async (ctx) => {
    await ctx.answerCbQuery('בודק יומן');
    const supabase = getSupabase();
    const profile = supabase ? await getRoleProfile(supabase, ctx.from?.id) : null;
    const effectiveRole = getEffectiveBotRole(profile?.role, ctx.session?.previewRole);
    if (effectiveRole === 'admin') {
      await sendAdminSystemOverviewFromChat(ctx, getWebAppUrl());
      return;
    }
    if (effectiveRole === 'master') {
      await sendManagerCalendarStartFromChat(ctx, getWebAppUrl());
      return;
    }
    await sendClientBookingsStartFromChat(ctx, getWebAppUrl());
  });

  bot.action('chat_services_start', async (ctx) => {
    await ctx.answerCbQuery('בודק שירותים');
    await sendManagerServicesStartFromChat(ctx, getWebAppUrl());
  });

  bot.action('chat_template_menu', async (ctx) => {
    await ctx.answerCbQuery('פותח הודעות');
    await sendTemplateMenuFromChat(ctx, getWebAppUrl());
  });

  bot.action('chat_admin_overview', async (ctx) => {
    await ctx.answerCbQuery('פותח מצב אדמין');
    await sendAdminSystemOverviewFromChat(ctx, getWebAppUrl());
  });

  bot.action(/^chat_template_(birthday|reminder|promo|aftercare)$/, async (ctx) => {
    await ctx.answerCbQuery('מכין טיוטה');
    const supabase = getSupabase();
    const profile = supabase ? await getRoleProfile(supabase, ctx.from?.id) : null;
    const draft = getChatTemplateDraft(ctx.match[1], profile?.business_name || profile?.full_name || 'BeautyOS');

    await ctx.reply(
      `${draft.title}\n\n${draft.text}\n\nזאת טיוטה בלבד. אפשר להעתיק, לערוך, או לפתוח את מרכז ההודעות להמשך.`,
      Markup.inlineKeyboard([
        [Markup.button.webApp('מרכז הודעות וברכות', `${getWebAppUrl()}/messages`)],
        [Markup.button.callback('טיוטה אחרת', 'chat_template_menu')],
      ])
    );
  });

  // --- INTERACTIVE DESIGN HANDLERS (v34) ---

  const designMenu = (ctx: any, fileId: string) => {
    const overlay = ctx.session?.lastOverlay || [];
    const findItem = (type: string) => overlay.find((o: any) => o.type === type);
    const hasLogo = overlay.some((o: any) => o.type === 'LOGO');
    const hasPromo = overlay.some((o: any) => o.type === 'PROMO');

    const priceText = findItem('PRICE') ? `✅ מחיר: ${findItem('PRICE').text.slice(0,15)}` : '💰 הוסף מחיר';
    const titleText = findItem('TITLE') ? `✅ כותרת: ${findItem('TITLE').text.slice(0,10)}...` : '🖌 הוסף כותרת';
    const logoText = hasLogo ? '✅ לוגו: פעיל' : '💎 לוגו: ❌';
    const promoText = hasPromo ? '✅ מבצע פעיל' : '🎁 מבצע';

    return Markup.inlineKeyboard([
      [Markup.button.callback(priceText, `design_PRICE_#_${fileId.slice(-6)}`), Markup.button.callback(titleText, `design_TITLE_#_${fileId.slice(-6)}`)],
      [Markup.button.callback(logoText, `design_LOGO_#_${fileId.slice(-6)}`), Markup.button.callback(promoText, `design_PROMO_#_${fileId.slice(-6)}`)],
      [Markup.button.callback('🚀 אישור והמשך לעיבוד', `design_DONE_#_${fileId.slice(-6)}`), Markup.button.callback('🧹 נקה הכל', `design_RESET_#_${fileId.slice(-6)}`)]
    ]);
  };

  async function triggerDesignRender(ctx: BotContext, fileId: string) {
    try {
      // 🚀 IMMEDIATE UI FEEDBACK (v53.0)
      const overlay = ctx.session?.lastOverlay || [];
      const statusText = overlay.length > 0 
        ? `✨ **סטטוס עיצוב נוכחי:**\n${overlay.map((o: any) => `- ${o.type}: ${o.text}`).join('\n')}`
        : 'לחץ על הכפתורים למטה כדי להוסיף תוכן.';

      const caption = `🎨 **לוח בקרה (מעדכן...) - סטודיו BeautyOS**\n\n${statusText}\n\nבסיום, לחץ על **אישור והמשך** כדי לעבור לשלב הבא.`;

      // 🔄 Anti-Spam (v52.4): Edit the existing message markup and caption
      await ctx.editMessageCaption(caption, {
        parse_mode: 'Markdown',
        ...designMenu(ctx, fileId)
      }).catch(e => console.log('[PanelUpdate] No changes or error:', e.message));

      // After a short delay, remove the "updating" text if no other update arrived
      setTimeout(async () => {
        const finalCaption = `🎨 **לוח בקרה - סטודיו BeautyOS**\n\n${statusText}\n\nבסיום, לחץ על **אישור והמשך** כדי לעבור לשלב הבא.`;
        await ctx.editMessageCaption(finalCaption, {
          parse_mode: 'Markdown',
          ...designMenu(ctx, fileId)
        }).catch(() => {});
      }, 1000);

    } catch (e) {
      console.error('PANEL_UPDATE_ERR:', e);
    }
  }

  // 1. Text Input Handlers
  const designTypes = ['PRICE', 'TITLE', 'PROMO'];
  designTypes.forEach(type => {
    bot.action(new RegExp(`design_${type}_#_(.+)`), async (ctx) => {
      const fileId = ctx.match[1];
      ctx.session.designWaitingFor = type;
      ctx.session.lastDesignFileId = fileId;
      
      const prompts: any = {
        PRICE: 'כיתבו מה שתרצו שיופיע על ה-Label (למשל: "מחיר השקה! 150" או "עכשיו רק 120₪")',
        TITLE: '🖌 מה הכותרת השיווקית שתרצה להוסיף? (למשל: מניקור ג׳ל מפנק)',
        PROMO: '🎁 מה תוכן המבצע המיוחד? (למשל: 30% הנחה לחברות חדשות)'
      };

      await ctx.answerCbQuery();
      await ctx.reply(prompts[type]);
    });
  });

  // 2. Instant Logo Toggle Holder (v52.4)
  bot.action(/design_LOGO_#_(.+)/, async (ctx) => {
    const fileId = ctx.match[1];
    ctx.session.lastOverlay = ctx.session.lastOverlay || [];
    
    const logoIdx = ctx.session.lastOverlay.findIndex((o: any) => o.type === 'LOGO');
    if (logoIdx > -1) {
      ctx.session.lastOverlay.splice(logoIdx, 1);
      await ctx.answerCbQuery('💎 לוגו הוסר.');
    } else {
      const supabase = getSupabase();
      let logoText = 'BeautyOS';
      if (supabase) {
        const { data: user } = await supabase.from('users').select('business_name').eq('telegram_id', ctx.from.id).single();
        if (user?.business_name) logoText = user.business_name;
      }
      
      ctx.session.lastOverlay.push({
        type: 'LOGO',
        text: logoText,
        fontSize: 40,
        yPosition: 0.92,
        color: 'rgba(255,255,255,0.7)'
      });
      await ctx.answerCbQuery('💎 לוגו נוסף בהצלחה.');
    }

    return triggerDesignRender(ctx, fileId);
  });

  // 🧹 Reset Handler
  bot.action(/design_RESET_#_(.+)/, async (ctx) => {
    const fileId = ctx.match[1];
    ctx.session.lastOverlay = [];
    await ctx.answerCbQuery('🧹 הכל נוקה.');
    return triggerDesignRender(ctx, fileId);
  });

  // 3. Finalize & Show Social Selection (Next Stage Gate v52.4)
  bot.action(/design_DONE_#_(.+)/, async (ctx) => {
    const fileId = ctx.match[1];
    await ctx.answerCbQuery('🚀 עובר לבחירת פורמט...');
    ctx.session.designWaitingFor = null;

    // Moving from Design Panel to Next Stage: Format Picking
    return ctx.reply('✨ **שלב העיצוב הושלם!**\nבחר כעת רשת חברתית לביצוע הרטוש והפקת הפוסט:', Markup.inlineKeyboard([
      [Markup.button.callback('📸 Instagram (4:5)', `format_INST_#_${fileId}`)],
      [Markup.button.callback('🟢 WhatsApp Story (9:16)', `format_WATS_#_${fileId}`)],
      [Markup.button.callback('📘 Facebook (1:1)', `format_FACE_#_${fileId}`)]
    ]));
  });

  // 4. Message Interceptor (Input Capture)
  bot.on('text', async (ctx, next) => {
    if (ctx.session?.designWaitingFor) {
      const text = ctx.message.text;
      const type = ctx.session.designWaitingFor;
      const fileId = ctx.session.lastDesignFileId;

      ctx.session.lastOverlay = ctx.session.lastOverlay || [];
      
      // Remove old of same type
      const oldIdx = ctx.session.lastOverlay.findIndex((o: any) => o.type === type);
      if (oldIdx > -1) ctx.session.lastOverlay.splice(oldIdx, 1);

      let line: any = { type, text };
      if (type === 'PRICE') line = { ...line, text: text, fontSize: 62, color: '#FFFFFF' };
      else if (type === 'TITLE') line = { ...line, text: text, fontSize: 64, color: '#FFFFFF' };
      else if (type === 'PROMO') line = { ...line, text: text, fontSize: 80, color: '#FFD700' };

      ctx.session.lastOverlay.push(line);
      ctx.session.designWaitingFor = null;

      // 🔄 Immediate Responsive Feedback (v52.9 Force Sync)
      // Save to Supabase first for absolute persistence
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('bot_sessions').upsert({
          user_id: ctx.from.id,
          session_data: ctx.session,
          updated_at: new Date().toISOString()
        });
      }

      await triggerDesignRender(ctx, fileId);

      // Delete the input message to keep chat clean
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
      try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }
      return;
    }
    return next();
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const supabase = getSupabase();
    const webAppUrl = getWebAppUrl();
    let userRole: BotRole = 'client';

    if (supabase && ctx.from?.id) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('telegram_id', ctx.from.id)
        .single();
      if (dbUser?.role) userRole = normalizeBotRole(dbUser.role);
    }

    const effectiveRole = getEffectiveBotRole(userRole, ctx.session?.previewRole);
    const isManager = effectiveRole === 'master' || effectiveRole === 'admin';
    const understood = classifyConversationIntent(text);
    const isActionRequest = understood.mode === 'act';
    const isInfoRequest = understood.mode === 'inform';

    const actionPrefix = isActionRequest
      ? 'הבנתי. אני לא עושה פעולה סופית בלי אישור, אבל פתחתי לך את הכיוון הנכון.'
      : isInfoRequest
        ? 'בטח. אני מסביר בקצרה, בלי לבצע פעולה.'
        : 'אני רוצה לדייק ולא לעשות משהו לא נכון.';

    const quickKeyboard = (rows: any[][]) => Markup.inlineKeyboard(rows);

    if (effectiveRole === 'admin') {
      switch (understood.intent) {
        case 'appointment':
          await sendAdminAppointmentChoiceFromChat(ctx, webAppUrl);
          return;
        case 'calendar':
        case 'status':
        case 'smalltalk':
        case 'unknown':
          await sendAdminSystemOverviewFromChat(ctx, webAppUrl);
          return;
        case 'messages':
          await sendTemplateMenuFromChat(ctx, webAppUrl);
          return;
        case 'services':
        case 'settings':
          await ctx.reply(
            `${actionPrefix}\n\nכאן אפשר לבדוק או לעדכן את ההגדרות והמחירים של צד המאסטר. אם המטרה היא רק בדיקה, עדיף לעבור קודם למצב מאסטר.`,
            quickKeyboard([
              [Markup.button.callback('בדיקה כמאסטר', 'preview_role_master')],
              [Markup.button.webApp('פתיחת הגדרות', `${webAppUrl}/settings`)],
            ])
          );
          return;
        case 'pricing':
          await ctx.reply(
            `${actionPrefix}\n\nיש כאן שני דברים שונים: מינוי BeautyOS הוא התשלום על המערכת, ושירותים ומחירים הם המחירים שהלקוחות רואים לפני קביעת תור.`,
            quickKeyboard([
              [Markup.button.webApp('פתיחת מינוי BeautyOS', `${webAppUrl}/pricing`)],
              [Markup.button.callback('בדיקה כמאסטר', 'preview_role_master')],
            ])
          );
          return;
        case 'portfolio':
        case 'image_post':
          await ctx.reply(
            `${actionPrefix}\n\nיצירת פוסטים, שיפור תמונות ותיק עבודות שייכים לצד המאסטר. אפשר לעבור לבדיקה כמאסטר ולהמשיך משם.`,
            quickKeyboard([
              [Markup.button.callback('בדיקה כמאסטר', 'preview_role_master')],
              [Markup.button.webApp('פתיחת תיק עבודות', `${webAppUrl}/portfolio`)],
            ])
          );
          return;
        default:
          await sendAdminSystemOverviewFromChat(ctx, webAppUrl);
          return;
      }
    }

    if (isManager) {
      switch (understood.intent) {
        case 'appointment':
          await sendManagerAppointmentReply(ctx, webAppUrl, text);
          return;
        case 'calendar':
          await sendManagerCalendarStartFromChat(ctx, webAppUrl);
          return;
        case 'services':
        case 'settings':
          await sendManagerServicesStartFromChat(ctx, webAppUrl);
          return;
        case 'messages':
          await sendTemplateMenuFromChat(ctx, webAppUrl);
          return;
        case 'image_post':
          await ctx.reply(
            `${actionPrefix}\n\nכדי להכין פוסט או לשפר תמונה, שלחי כאן תמונה בצ'אט. אחרי זה אבקש לבחור סגנון ואציג תוצאה להמשך עבודה.\n\nאם רק שאלת מה אפשר לעשות: אפשר ריטוש, פוסט לאינסטגרם, סטורי, טקסט שיווקי ועיצוב מותאם.`,
            quickKeyboard([
              [Markup.button.webApp('פתחי גלריה ותיק עבודות', `${webAppUrl}/portfolio`)],
              [Markup.button.webApp('פתחי הודעות וברכות', `${webAppUrl}/messages`)],
            ])
          );
          return;
        case 'pricing':
          await ctx.reply(
            `${actionPrefix}\n\nבמינוי BeautyOS אפשר לראות חבילות ומסלולים של המערכת. מחירי טיפולים עצמם מנוהלים במסך שירותים ומחירים.`,
            quickKeyboard([
              [Markup.button.webApp('פתיחת מינוי BeautyOS', `${webAppUrl}/pricing`)],
              [Markup.button.webApp('עריכת שירותים ומחירים', `${webAppUrl}/settings`)],
            ])
          );
          return;
        case 'portfolio':
          await ctx.reply(
            `${actionPrefix}\n\nבתיק העבודות אפשר לשמור ולהציג עבודות. אם תרצי ליצור חומר חדש, שלחי תמונה כאן בצ'אט.`,
            quickKeyboard([
              [Markup.button.webApp('פתחי תיק עבודות', `${webAppUrl}/portfolio`)],
              [Markup.button.webApp('פתחי סטודיו', `${webAppUrl}/`)],
            ])
          );
          return;
        case 'status':
          await ctx.reply(
            'אני כאן והבוט פעיל. אם משהו לא נפתח או נראה חסר, כתבי לי מה ניסית לעשות ואני אכוון אותך למסך הנכון.',
            quickKeyboard([
              [Markup.button.webApp('פתחי סטודיו', `${webAppUrl}/`)],
              [Markup.button.webApp('פתחי יומן', `${webAppUrl}/calendar`)],
            ])
          );
          return;
        case 'smalltalk':
          await ctx.reply(
            'היי, אני כאן. אפשר לכתוב רגיל: לקבוע תור, לפתוח יומן, להכין פוסט, לערוך שירותים או להכין הודעה ללקוחה.',
            quickKeyboard([
              [Markup.button.webApp('פתחי סטודיו', `${webAppUrl}/`)],
              [Markup.button.webApp('הודעות וברכות', `${webAppUrl}/messages`)],
            ])
          );
          return;
        default:
          await ctx.reply(
            `${actionPrefix}\n\nאני יכול לעזור בניהול יומן, שירותים, מחירון, הודעות וברכות, תיק עבודות, וגם בהכנת פוסטים מתמונה.\n\nכתבי למשל: "תפתח יומן", "איך משנים מחיר?", או "תכין לי פוסט".`,
            quickKeyboard([
              [Markup.button.webApp('יומן וניהול תורים', `${webAppUrl}/calendar`)],
              [Markup.button.webApp('שירותים והגדרות', `${webAppUrl}/settings`)],
              [Markup.button.callback('הכנת הודעה בצ׳אט', 'chat_template_menu')],
            ])
          );
          return;
      }
    }

    switch (understood.intent) {
      case 'appointment':
      case 'calendar':
        if (includesAnyPhrase(understood.normalizedText, clientCancelTerms)) {
          await ctx.reply(
            isActionRequest
              ? 'הבנתי. כדי שלא יתבטל בטעות התור הלא נכון, אני פותח לך את התורים שלך ושם אפשר לבחור את התור הנכון ולאשר ביטול.'
              : 'בטח. ביטול תור עושים מתוך רשימת התורים שלך, כדי לבחור בדיוק את התור הנכון. אני פותח לך את זה.',
            quickKeyboard([
              [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
              [Markup.button.webApp('קביעת תור חדש', `${webAppUrl}/discovery`)],
            ])
          );
          return;
        }

        if (includesAnyPhrase(understood.normalizedText, clientRescheduleTerms)) {
          await ctx.reply(
            isActionRequest
              ? 'בשמחה. כדי להזיז תור בלי לטעות בשעה או בתאריך, אני פותח לך את התורים שלך. משם אפשר לבחור את התור ולעדכן אותו.'
              : 'כן, אפשר להזיז תור. הכי נוח לעשות את זה מתוך רשימת התורים שלך, ושם לבחור שעה או תאריך חדש.',
            quickKeyboard([
              [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
              [Markup.button.webApp('קביעת תור חדש', `${webAppUrl}/discovery`)],
            ])
          );
          return;
        }

        if (understood.intent === 'calendar') {
          await sendClientBookingsStartFromChat(ctx, webAppUrl);
          return;
        }

        await sendBookingStartFromChat(ctx, webAppUrl);
        return;
      case 'messages':
        await ctx.reply(
          `${actionPrefix}\n\nכל מה שקשור להודעות ותזכורות עובר דרך התורים שלך והשיחה עם הבוט. אם תרצי, אני פותח לך את רשימת התורים.`,
          quickKeyboard([
            [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
            [Markup.button.webApp('קביעת תור חדש', `${webAppUrl}/discovery`)],
          ])
        );
        return;
      case 'pricing':
      case 'services':
        await ctx.reply(
          `${actionPrefix}\n\nאצל לקוח, המחירים מופיעים כשבוחרים בעלת מקצוע וטיפול. אני פותח לך את הבחירה הנכונה.`,
          quickKeyboard([
            [Markup.button.webApp('בחירת מומחה וטיפול', `${webAppUrl}/discovery`)],
            [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
          ])
        );
        return;
      case 'image_post':
        await ctx.reply(
          'יצירת פוסטים ושיפור תמונות מיועדים כרגע לבעלות עסק בתוך הבוט. אם את בעלת עסק, היכנסי כאדמין או מאסטר ואז שלחי תמונה כאן בצ\'אט.',
          quickKeyboard([
            [Markup.button.webApp('פתחי את המערכת', `${webAppUrl}/`)],
            [Markup.button.callback('הרשמה כבעלת עסק', 'register_request')],
          ])
        );
        return;
      case 'smalltalk':
        await ctx.reply(
          'היי, אני כאן. אפשר לכתוב רגיל: "אני רוצה לקבוע תור", "איפה התורים שלי?", "כמה זה עולה?" או "אני רוצה להזיז תור".',
          quickKeyboard([
            [Markup.button.webApp('קביעת תור', `${webAppUrl}/discovery`)],
            [Markup.button.webApp('התורים שלי', `${webAppUrl}/calendar`)],
          ])
        );
        return;
      default:
        await ctx.reply(
          `${actionPrefix}\n\nאני יכול לעזור בקביעת תור חדש, בדיקת התורים שלך, והכוונה לביטול או שינוי תור.\n\nכתבי למשל: "אני רוצה לקבוע תור", "איפה התורים שלי?" או "אני רוצה להזיז תור".`,
          quickKeyboard([
            [Markup.button.callback('התחלת קביעת תור', 'chat_booking_start')],
            [Markup.button.callback('בדיקת התורים שלי', 'chat_calendar_start')],
          ])
        );
    }
  });

  // Photo handler
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo.pop();
    if (!photo) return;

    const caption = (ctx.message as any).caption; 
    const msg = await ctx.reply('⏳ **מנתח את התמונה ויוצר קסם... (תהליך זה מתבצע ברקע ויושלם בקרוב)** ✨');

    try {
      // 🕵️ ZERO STALE STATE FIX (v64.2)
      // Immediately clear the master-cache and old overlays for the new photo
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('bot_sessions').update({
          session_data: {
            ...ctx.session,
            enhancedMaster: null,
            lastOverlay: [],
            status: 'processing_new_photo'
          }
        }).eq('user_id', ctx.chat.id);
      }
      if (ctx.session) {
        ctx.session.enhancedMaster = null;
        ctx.session.lastOverlay = [];
      }

      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      
      const { enqueueAiProcessing } = await import('./qstash.js');
      await enqueueAiProcessing(ctx.chat.id, msg.message_id, fileLink.href, photo.file_id, caption);
    } catch (error: any) {
      console.error('PHOTO HANDLER ERROR:', error);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ תקלה בתור לעיבוד (QStash): ${error.message}`);
    }
  });

  // Handler for Formats (Triggering the background worker)
  bot.action(/^format_(.*)/, async (ctx) => {
    try {
      const parts = ctx.match[1].split('_#_');
      const formatType = parts[0]; 
      
      await ctx.answerCbQuery('🎨 בונה את המופע הסופי...');
      
      const userId = ctx.from?.id;
      if (!userId) return;

      // Reset Master Cache for the new request (Safe-sync v52.2)
      if (ctx.session) ctx.session.enhancedMasterId = null;

      await ctx.reply(`🚀 מבצע רטוש AI ועיצוב סופי...\nזה ייקח כ-30 שניות. אנחנו נשלח לך את התוצאה לכאן! ✨`);

      const { enqueueRenderProcessing } = await import('./qstash.js');
      await enqueueRenderProcessing(userId, formatType);

    } catch (err: any) {
    console.error('BOT LOGIC ERROR:', err);
    if (ctx) ctx.reply(`❌ שגיאה במערכת: ${err.message}`);
  }
  });

  // Portfolio Callback
  bot.action(/^star_pf_/, async (ctx) => {
    const supabase = getSupabase();
    if (!supabase || !ctx.from) return;

    const userId = ctx.from.id;
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (profileError || !profile) {
      await ctx.answerCbQuery('הפרופיל לא נמצא.');
      return;
    }
    
    // Check limit
    const { data: currentPortfolio } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', profile.id);

    if (currentPortfolio && currentPortfolio.length >= 5) {
      // Portfolio full - Ask to replace
      await ctx.answerCbQuery('הפורטפוליו מלא (5/5). בחר איזו עבודה להחליף.');
      // Logic for replacement: Show buttons with numbers and thumbnails (if possible)
      // For now: Just buttons 1-5
      const buttons = currentPortfolio.map((item, index) => 
        [Markup.button.callback(`📷 החלף עבודה #${index + 1}`, `replace_portfolio_${item.id}`)]
      );
      await ctx.reply('בחר עבודה להסרה מהפורٹפוליו:', Markup.inlineKeyboard(buttons));
    } else {
      // Save to storage and DB
      await ctx.answerCbQuery('מעלה לפורטפוליו...');
      const imageData = Buffer.from(ctx.session.lastEnhancedImage.buffer, 'base64');
      const enhanced = await enhanceImage(imageData, ctx.session.lastEnhancedImage.imagenPrompt);
      
      const publicUrl = await uploadToPortfolio(userId, enhanced);
      if (publicUrl) {
        await supabase.from('portfolio').insert([{ user_id: profile.id, image_url: publicUrl }]);
        await ctx.reply('✅ העבודה נוספה לפורטפוליו במיני-אפ!');
      }
    }
  });

  bot.action(/^replace_portfolio_(.+)/, async (ctx) => {
    const portfolioId = ctx.match[1];
    const supabase = getSupabase();
    if (!supabase || !ctx.from) return;

    await ctx.answerCbQuery('מעדכן...');
    
    const userId = ctx.from.id;
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', userId)
      .single();

    if (profileError || !profile) {
      await ctx.answerCbQuery('הפרופיל לא נמצא.');
      return;
    }

    // Delete old only if it belongs to the current Telegram user.
    await supabase.from('portfolio').delete().eq('id', portfolioId).eq('user_id', profile.id);
    
    // Add new
    const imageData = Buffer.from(ctx.session.lastEnhancedImage.buffer, 'base64');
    const enhanced = await enhanceImage(imageData, ctx.session.lastEnhancedImage.imagenPrompt);
    const publicUrl = await uploadToPortfolio(userId, enhanced);
    
    if (publicUrl) {
      await supabase.from('portfolio').insert([{ user_id: profile.id, image_url: publicUrl }]);
      await ctx.reply('✅ העבודה הוחלפה בהצלחה!');
    }
  });
}
