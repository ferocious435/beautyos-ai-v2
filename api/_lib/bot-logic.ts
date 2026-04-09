 
 
import { Scenes, Context, Telegraf, Markup } from 'telegraf';
import { getSupabase, uploadToPortfolio } from './supabase.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { analyzeAndGenerate, enhanceImage } from './content-engine.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { enqueueAiProcessing } from './qstash.js';
import { CONFIG } from './config.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios from 'axios';

export interface BotContext extends Context {
  session: unknown;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

export const REGISTRATION_SCENE_ID = 'REGISTRATION_SCENE';

// --- Session Middleware (Supabase Stateless) ---
export async function supabaseSessionMiddleware(ctx: unknown, next: () => Promise<void>) {
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
        [Markup.button.callback('💆‍♂️ אני מאסטר (Professional Master)', 'set_role_master')],
        [Markup.button.callback('🛍️ אני לקוח (Private Client)', 'set_role_client')]
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    // Process Callback
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const role = ctx.callbackQuery.data === 'set_role_master' ? 'master' : 'client';
      (ctx.wizard.state as unknown).role = role;
      await ctx.answerCbQuery();
      await ctx.reply(`מעולה! בחרתם ${role === 'master' ? 'מאסטר' : 'לקוח'}. איך קוראים לכם?`);
      return ctx.wizard.next();
    }
    return ctx.reply('נא לבחור תפקיד מהכפתורים למעלה.');
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין שם.');
    (ctx.wizard.state as unknown).name = ctx.message.text;
    await ctx.reply('מעולה! מה שם העסק שלכם? (למשל: "הסטודיו של שרה")');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין שם עסק.');
    (ctx.wizard.state as unknown).businessName = ctx.message.text;
    await ctx.reply('מה מספר הטלפון שלכם ליצירת קשר?');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return ctx.reply('נא להזין מספר טלפון.');
    (ctx.wizard.state as unknown).phone = ctx.message.text;
    await ctx.reply('📍 **מיקום העסק:**\nלחצו על הכפתור למטה כדי לשלוח מיקום, או כתבו את הכתובת המדויקת שלכם בטקסט.', 
      Markup.keyboard([
        [Markup.button.locationRequest('📍 שלח מיקום'), Markup.button.text('דילוג')]
      ]).oneTime().resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const { name, businessName, phone, role } = ctx.wizard.state as unknown;
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
  bot.catch((err: unknown, ctx) => {
    console.error(`Telegraf error for ${ctx.updateType}`, err);
    ctx.reply('⚠️ חלה שגיאה במערכת. אנחנו כבר מטפלים בזה!');
  });

  // Start command
  bot.start(async (ctx) => {
    // 🧹 Refresh UI
    try {
      const clearMsg = await ctx.reply('מעדכן ממשק...', Markup.removeKeyboard());
      await ctx.deleteMessage(clearMsg.message_id);
   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) { /* ignore */ }

    const name = ctx.from?.first_name || 'Beauty Expert';
    const payload = (ctx.message as unknown).text.split(' ')[1]; // Payload: /start <payload>

    const supabase = getSupabase();

    // MAGIC ADMIN BYPASS (Zero-Click Registration for Owner)
    if (payload === 'root' || payload === 'admin') {
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
      
      const adminMenu = Markup.keyboard([
        [Markup.button.webApp('🚀 פתח הכל ב-Studio', process.env.WEBAPP_URL || '')],
        ['🗓️ תורים שלי', '⚙️ הגדרות']
      ]).resize();

      return ctx.reply(`🏰 **ברוך שובך, מנהל המערכת (${name})!**\n\nקיבלת הרשאות Admin מלאה.\n💡 *הערה: כל כלי ה-AI (שיפור תמונות, פוסטים) עובדים ישירות כאן בצ'אט (פשוט שלח/י תמונה). כל פונקציות המערכת פתוחות עבורך ב-Mini App.*`, adminMenu);
    } else {
      // 🛍 REGULAR USER FLOW
      await ctx.reply(`✨ **ברוכים הבאים ל-BeautyOS AI v2!** ✨\n\nהיי ${name}, המערכת מזהה אותך.\n💡 *יצירת פוסטים ושיפור תמונות מתבצעים ישירות כאן בצ'אט - פשוט שלח/י ויזואליה!*`, 
        Markup.inlineKeyboard([
          [Markup.button.webApp('🗓️ יומן והזמנת תורים', process.env.WEBAPP_URL || '')],
          [Markup.button.callback('📝 הרשמה למערכת', 'register_request')]
        ])
      );
    }

    // 📱 Persistent Role-Aware Reply Menu (v2.3)
    const webAppUrl = process.env.WEBAPP_URL || '';
    
    // Fetch latest role for keyboard selection
    let userRole = 'client';
    const { data: dbUser } = await supabase.from('users').select('role').eq('telegram_id', ctx.from?.id).single();
    if (dbUser) userRole = dbUser.role;

    let kb: unknown[] = [];
    
    if (userRole === 'admin' || userRole === 'master') {
      kb = [
        [{ text: '🚀 פתח הכל ב-Studio', web_app: { url: `${webAppUrl}/?start=root` } }],
        [{ text: '🗓️ ניהול יומן', web_app: { url: `${webAppUrl}/calendar` } }, { text: '⚙️ הגדרות', web_app: { url: `${webAppUrl}/settings` } }]
      ];
    } else {
      kb = [
        [{ text: '🔍 חיפוש מומחה וקביעת תור', web_app: { url: `${webAppUrl}/discovery` } }],
        [{ text: '🗓️ התורים שלי', web_app: { url: `${webAppUrl}/calendar` } }, { text: '⚙️ הגדרות', web_app: { url: `${webAppUrl}/settings` } }]
      ];
    }
    
    await ctx.reply('תפריט הניווט הראשי עודכן 👇', Markup.keyboard(kb).resize());
  });

  bot.action('register_request', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  // Command handlers
  bot.command('register', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));
  bot.hears('📝 הרשמה', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  bot.command('role', async (ctx) => {
    const role = (ctx.message as unknown).text.split(' ')[1];
    if (!['master', 'client', 'admin'].includes(role)) {
      return ctx.reply('❌ Use: /role <master|client|admin>');
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
      const supabase = getSupabase();
      if (supabase && ctx.from) {
        await supabase.from('users').update({ role }).eq('telegram_id', ctx.from.id);
        await ctx.answerCbQuery(`Role set to ${role}`);
        await ctx.reply(`✅ תפקידך שונה ל: **${role}**.\nפתח את ה-Studio מחדש.`);
      }
    });
  });



  bot.hears('📜 תנאי שימוש', (ctx) => {
    ctx.reply('💄 **BeautyOS AI v2**\nכל הזכויות שמורות. מופעל באמצעות בינה מלאכותית מתקדמת.');
  });

  // --- INTERACTIVE DESIGN HANDLERS (v34) ---

  const designMenu = (ctx: unknown, fileId: string) => {
    const overlay = ctx.session?.lastOverlay || [];
    const findItem = (type: string) => overlay.find((o: unknown) => o.type === type);
    const hasLogo = overlay.some((o: unknown) => o.type === 'LOGO');
    const hasPromo = overlay.some((o: unknown) => o.type === 'PROMO');

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
        ? `✨ **סטטוס עיצוב נוכחי:**\n${overlay.map((o: unknown) => `- ${o.type}: ${o.text}`).join('\n')}`
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
      
      const prompts: unknown = {
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
    
    const logoIdx = ctx.session.lastOverlay.findIndex((o: unknown) => o.type === 'LOGO');
    if (logoIdx > -1) {
      ctx.session.lastOverlay.splice(logoIdx, 1);
      await ctx.answerCbQuery('💎 לוגו הוסר.');
    } else {
      const supabase = getSupabase();
      let logoText = 'Beauty Expert';
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
      const oldIdx = ctx.session.lastOverlay.findIndex((o: unknown) => o.type === type);
      if (oldIdx > -1) ctx.session.lastOverlay.splice(oldIdx, 1);

      let line: unknown = { type, text };
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

  // Photo handler
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo.pop();
    if (!photo) return;

    const caption = (ctx.message as unknown).caption; 
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
    } catch (error: unknown) {
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

    } catch (err) {
      console.error('FORMAT ERROR:', err);
      ctx.reply('שגיאה בתקשורת עם השרת.');
    }
  });

  // Portfolio Callback
  bot.action(/^star_pf_/, async (ctx) => {
    const supabase = getSupabase();
    if (!supabase || !ctx.from) return;

    const userId = ctx.from.id;
    
    // Check limit
    const { data: currentPortfolio } = await supabase
      .from('portfolio')
      .select('*')
      .eq('user_id', userId);

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
        await supabase.from('portfolio').insert([{ user_id: userId, image_url: publicUrl }]);
        await ctx.reply('✅ העבודה נוספה לפורטפוליו במיני-אפ!');
      }
    }
  });

  bot.action(/^replace_portfolio_(.+)/, async (ctx) => {
    const portfolioId = ctx.match[1];
    const supabase = getSupabase();
    if (!supabase || !ctx.from) return;

    await ctx.answerCbQuery('מעדכן...');
    
    // Delete old
    await supabase.from('portfolio').delete().eq('id', portfolioId);
    
    // Add new
    const userId = ctx.from.id;
    const imageData = Buffer.from(ctx.session.lastEnhancedImage.buffer, 'base64');
    const enhanced = await enhanceImage(imageData, ctx.session.lastEnhancedImage.imagenPrompt);
    const publicUrl = await uploadToPortfolio(userId, enhanced);
    
    if (publicUrl) {
      await supabase.from('portfolio').insert([{ user_id: userId, image_url: publicUrl }]);
      await ctx.reply('✅ העבודה הוחלפה בהצלחה!');
    }
  });
}
