import { Scenes, Context, Telegraf, Markup } from 'telegraf';
import { getSupabase, uploadToPortfolio } from './supabase.js';
import { analyzeAndGenerate, enhanceImage } from './content-engine.js';
import { enqueueAiProcessing } from './qstash.js';
import { CONFIG } from './config.js';
import axios from 'axios';

export interface BotContext extends Context {
  session: any;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

export const REGISTRATION_SCENE_ID = 'REGISTRATION_SCENE';

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
      (ctx.wizard.state as any).role = role;
      await ctx.answerCbQuery();
      await ctx.reply(`מעולה! בחרתם ${role === 'master' ? 'מאסטר' : 'לקוח'}. איך קוראים לכם?`);
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
    // 🧹 Refresh UI
    try {
      const clearMsg = await ctx.reply('מעדכן ממשק...', Markup.removeKeyboard());
      await ctx.deleteMessage(clearMsg.message_id);
    } catch (e) {}

    const name = ctx.from?.first_name || 'Beauty Expert';
    const payload = (ctx.message as any).text.split(' ')[1]; // Payload: /start <payload>

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

    // 📱 Persistent Reply Menu
    const webAppUrl = process.env.WEBAPP_URL || '';
    const nameStr = ctx.from?.first_name || '';
    
    // Magic Admin Fast-Track
    if (payload === 'root' || payload === 'admin') {
      const supabase = getSupabase();
      if (supabase && ctx.from) {
        await supabase.from('users').upsert({
          telegram_id: ctx.from.id,
          full_name: nameStr,
          role: 'admin',
          business_name: 'Super Admin',
          phone: '+0000',
          address: 'System'
        }, { onConflict: 'telegram_id' });
      }
      ctx.reply('👑 Admin access granted.');
    }

    const kb: any[] = [
      [{ text: '🚀 פתח הכל ב-Studio', web_app: { url: `${webAppUrl}/?start=root` } }],
      [{ text: '🗓️ יומן תורים', web_app: { url: `${webAppUrl}/calendar` } }, { text: '⚙️ הגדרות', web_app: { url: `${webAppUrl}/settings` } }]
    ];
    
    await ctx.reply('תפריט הניווט הראשי עודכן 👇\n(לחץ על הכפתור "פתח הכל ב-Studio" כדי להתחיל)', Markup.keyboard(kb).resize());
  });

  bot.action('register_request', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  // Command handlers
  bot.command('register', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));
  bot.hears('📝 הרשמה', (ctx) => ctx.scene.enter(REGISTRATION_SCENE_ID));

  bot.command('role', async (ctx) => {
    const role = (ctx.message as any).text.split(' ')[1];
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

  const designMenu = (fileId: string) => Markup.inlineKeyboard([
    [Markup.button.callback('💰 הוסף מחיר', `design_PRICE_#_${fileId.slice(-6)}`), Markup.button.callback('🖌 הוסף כותרת', `design_TITLE_#_${fileId.slice(-6)}`)],
    [Markup.button.callback('💎 הוסף לוגו/שם', `design_LOGO_#_${fileId.slice(-6)}`), Markup.button.callback('🎁 מבצע מיוחד', `design_PROMO_#_${fileId.slice(-6)}`)],
    [Markup.button.callback('✨ סיימתי / ללא טקסט', `design_DONE_#_${fileId.slice(-6)}`)]
  ]);

  async function triggerDesignRender(ctx: BotContext, fileId: string) {
    const loadingMsg = await ctx.reply('🪄 מעדכן את העיצוב...');
    try {
      const { generateSocialPost } = await import('./graphic-engine.js');
      
      let imgBuffer: Buffer;
      if (ctx.session.lastEnhancedImage?.buffer) {
        console.log('[BotLogic] Using enhanced buffer from session');
        imgBuffer = Buffer.from(ctx.session.lastEnhancedImage.buffer, 'base64');
      } else {
        console.log('[BotLogic] Falling back to Telegram fileId:', fileId);
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        imgBuffer = Buffer.from(response.data);
      }

      const designed = await generateSocialPost(imgBuffer, {
        format: 'SQUARE_1_1',
        overlay: ctx.session.lastOverlay || [],
        theme: 'WATERMARK'
      });

      await ctx.replyWithPhoto({ source: designed }, {
        caption: '✅ העיצוב עודכן! ניתן להוסיף שכבות נוספות או לסיים:',
        ...designMenu(fileId)
      });
    } catch (e) {
      console.error('DESIGN_RENDER_ERR:', e);
      ctx.reply('❌ שגיאה בעדכון העיצוב.');
    } finally {
      await ctx.deleteMessage(loadingMsg.message_id);
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
        PRICE: '💰 מה המחיר שתרצה להוסיף? (למשל: 150)',
        TITLE: '🖌 מה הכותרת שתרצה להוסיף? (למשל: מניקור קלאסי)',
        PROMO: '🎁 מה המבצע המיוחד? (למשל: 20% הנחה)'
      };

      await ctx.answerCbQuery();
      await ctx.reply(prompts[type]);
    });
  });

  // 2. Instant Logo Handler
  bot.action(/design_LOGO_#_(.+)/, async (ctx) => {
    const fileId = ctx.match[1];
    await ctx.answerCbQuery('💎 מוסיף לוגו/שם...');
    
    const supabase = getSupabase();
    if (!supabase || !ctx.from) return;
    const { data: user } = await supabase.from('users').select('business_name, full_name').eq('telegram_id', ctx.from.id).single();
    const logoText = user?.business_name || user?.full_name || 'BeautyOS Expert';

    ctx.session.lastOverlay = ctx.session.lastOverlay || [];
    ctx.session.lastOverlay.push({
      text: logoText,
      fontSize: 40,
      yPosition: 0.92,
      color: 'rgba(255,255,255,0.7)'
    });

    return triggerDesignRender(ctx, fileId);
  });

  // 3. Finalize
  bot.action(/design_DONE_#_(.+)/, async (ctx) => {
    const fileId = ctx.match[1];
    await ctx.answerCbQuery();
    ctx.session.designWaitingFor = null;

    return ctx.reply('✨ העיצוב הושלם! בחר פורמט לשיתוף:', Markup.inlineKeyboard([
      [Markup.button.callback('📸 Instagram (4:5)', `fmt_INST_#_${fileId}`)],
      [Markup.button.callback('🟢 WhatsApp (9:16)', `fmt_WATS_#_${fileId}`)],
      [Markup.button.callback('📘 Facebook (1:1)', `fmt_FACE_#_${fileId}`)],
      [Markup.button.callback('⭐ הוספה לפורטפוליו', `star_pf_${fileId}`)]
    ]));
  });

  // 4. Message Interceptor (Must be added BEFORE general message handlers)
  bot.on('text', async (ctx, next) => {
    if (ctx.session?.designWaitingFor) {
      const text = ctx.message.text;
      const type = ctx.session.designWaitingFor;
      const fileId = ctx.session.lastDesignFileId;

      ctx.session.lastOverlay = ctx.session.lastOverlay || [];
      
      let line: any = { text };
      if (type === 'PRICE') line = { text: `${text} ₪`, fontSize: 72, yPosition: 0.75, color: '#FFFFFF' };
      else if (type === 'TITLE') line = { text: text.toUpperCase(), fontSize: 64, yPosition: 0.15, color: '#FFFFFF' };
      else if (type === 'PROMO') line = { text: `✨ ${text} ✨`, fontSize: 80, yPosition: 0.5, color: '#FFD700' };

      ctx.session.lastOverlay.push(line);
      ctx.session.designWaitingFor = null;

      return triggerDesignRender(ctx, fileId);
    }
    return next();
  });

  // Photo handler
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo.pop();
    if (!photo) return;

    const caption = (ctx.message as any).caption; 
    const msg = await ctx.reply('⏳ **מנתח את התמונה ויוצר קסם... (תהליך זה מתבצע ברקע ויושלם בקרוב)** ✨');

    try {
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      
      await enqueueAiProcessing(ctx.chat.id, msg.message_id, fileLink.href, photo.file_id, caption);
    } catch (error: any) {
      console.error('PHOTO HANDLER ERROR:', error);
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `❌ תקלה בתור לעיבוד (QStash): ${error.message}`);
    }
  });

  // Handler for Formats
  bot.action(/^fmt_(.*)/, async (ctx) => {
    try {
      const parts = ctx.match[1].split('_#_');
      const formatType = parts[0]; 
      
      await ctx.answerCbQuery('🎨 מעצב עבורך...');
      
      const session = ctx.session.lastImageScan;
      if (!session) return ctx.reply('מצטערים, המידע על התמונה אבד. אנא שלחו תמונה חדשה.');

      // 🚀 NANO BANANA PRO: On-Demand Quality Enhancement (v47)
      const loadingMsgContext = await ctx.reply(`📸 **משפר איכות ומשלים עיצוב (NANO BANANA PRO)...**`);
      
      let finalBaseBuffer: Buffer;
      const originalB64 = ctx.session.originalBuffer || ctx.session.lastEnhancedImage?.buffer;
      
      if (!originalB64) {
        return ctx.reply('מצטערים, המידע על התמונה אבד. אנא שלחו תמונה חדשה.');
      }
      
      // Real AI Improvement ONLY NOW per Sergey's Cost Optimization
      const rawBuffer = Buffer.from(originalB64, 'base64');
      const prompt = ctx.session.lastEnhancedImage?.imagenPrompt || 'Luxury beauty photography';
      
      try {
        finalBaseBuffer = await enhanceImage(rawBuffer, prompt);
      } catch (e) {
        console.warn('[BotLogic] On-demand enhancement failed, using original-res');
        finalBaseBuffer = rawBuffer;
      }

      const { generateSocialPost } = await import('./graphic-engine.js');
      
      let socialFormat: any = 'SQUARE_1_1';
      let formatName = 'Facebook (1:1)';
      
      if (formatType === 'INST') { socialFormat = 'INSTAGRAM_POST'; formatName = 'Instagram (4:5)'; }
      if (formatType === 'WATS') { socialFormat = 'STORY_9_16'; formatName = 'WhatsApp/Story (9:16)'; }
      if (formatType === 'FACE') { socialFormat = 'SQUARE_1_1'; formatName = 'Facebook (1:1)'; }

      const overlay = ctx.session.lastOverlay || [];

      const designedBuffer = await generateSocialPost(finalBaseBuffer, {
        format: socialFormat,
        businessName: 'Beauty Expert',
        overlay: overlay,
        theme: 'ORIGINAL_CLEAN'
      });

      await ctx.replyWithPhoto({ source: designedBuffer }, {
        caption: `✨ **התוצאה מוכנה!**\n📐 פורמט: **${formatName}**\n\nניתן להמשיך לבחור פורמטים נוספים מהתפריט למעלה.`
      });
      
      await ctx.deleteMessage(loadingMsgContext.message_id);

    } catch (err) {
      console.error('FORMAT ERROR:', err);
      ctx.reply('שגיאה ביצירת הפורמט.');
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
