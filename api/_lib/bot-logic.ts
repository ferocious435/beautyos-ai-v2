import { Scenes, Context, Telegraf, Markup } from 'telegraf';
import { getSupabase, uploadToPortfolio } from './supabase.js';
import { analyzeAndGenerate, enhanceImage } from './content-engine.js';
import { runWeeklyAnalysis } from './trend-analyzer.js';
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
    const { data } = await supabase
      .from('bot_sessions')
      .select('session_data')
      .eq('user_id', userId)
      .single();

    ctx.session = data?.session_data || {};
    await next();

    await supabase
      .from('bot_sessions')
      .upsert({ 
        user_id: userId, 
        session_data: ctx.session,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
  } catch (err) {
    console.error('SESSION ERROR:', err);
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

  bot.command('analyze_market', async (ctx) => {
    await ctx.reply('🔎 **מתחיל ניתוח שוק שבועי...** זה עשוי לקחת רגע.');
    try {
      const trends = await runWeeklyAnalysis();
      await ctx.reply(`📊 **ניתוח שוק הושלם!**\n\n👁 **ויזואליה:** ${trends.visualAnchors}\n\n💡 **מסרים:** ${trends.semanticAnchors}`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('❌ שגיאה בניתוח השוק.');
    }
  });

  // Photo handler
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo.pop();
    if (!photo) return;

    const caption = (ctx.message as any).caption; 
    const msg = await ctx.reply('⏳ **מנתח את התמונה (Gemini 3.1)...** ✨');

    try {
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const imageUrl = fileLink.href;

      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageData = Buffer.from(response.data);

      const ai = await analyzeAndGenerate(imageData, caption);

      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, undefined, `📸 **משפר ${ai.detectedService || 'תמונה'} (Imagen 4 Ultra)...** 🪄`);

      const finalImage = await enhanceImage(imageData, ai.imagenPrompt);

      await ctx.replyWithPhoto({ source: finalImage }, {
        caption: `🚀 **התוצאה מוכנה!** (${ai.detectedService})\n\n${ai.post}\n\n📸 **CTA:** ${ai.cta}`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📸 Instagram (4:5)', `fmt_INST_#_${photo.file_id.slice(-10)}`)],
          [Markup.button.callback('🟢 WhatsApp (9:16)', `fmt_WATS_#_${photo.file_id.slice(-10)}`)],
          [Markup.button.callback('📘 Facebook (1:1)', `fmt_FACE_#_${photo.file_id.slice(-10)}`)],
          [Markup.button.webApp('✨ עריכה בסטודיו (Mini App)', `${process.env.WEBAPP_URL}/?photo=${encodeURIComponent(imageUrl)}`) ],
          [Markup.button.callback('⭐ הוספה לפורטפוליו', `star_portfolio_${photo.file_id}`)]
        ])
      });

      // Храним в сессии данные для генерации форматов
      ctx.session.lastImageScan = {
        file_id: photo.file_id,
        ai: ai
      };

      await ctx.deleteMessage(msg.message_id);

    } catch (err) {
      console.error('Bot Studio Error:', err);
      await ctx.reply('⚠️ חלה שגיאה ביצירת התוכן. נסו שוב מאוחר יותר.');
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

      const loadingMsg = await ctx.reply('🪄 מעבד את העיצוב הסופי...');
      
      const fileLink = await ctx.telegram.getFileLink(session.file_id);
      const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const originalBuffer = Buffer.from(response.data);

      const { generateSocialPost } = await import('./graphic-engine.js');
      
      let jimpFormat: any = 'INSTAGRAM_POST';
      if (formatType === 'WATS') jimpFormat = 'STORY_9_16';
      if (formatType === 'FACE') jimpFormat = 'SQUARE_1_1';

      const designedBuffer = await generateSocialPost(originalBuffer, {
        format: jimpFormat,
        businessName: 'Beauty Expert', // Мы можем получить это из БД, если захотим
        title: session.ai.overlayTitle,
        subtitle: session.ai.overlaySubtitle,
        theme: 'LUXURY_BLACK'
      });

      await ctx.replyWithPhoto({ source: designedBuffer }, {
        caption: `✨ העיצוב שלך מושקע ומוכן ל- ${formatType}!`
      });
      
      await ctx.deleteMessage(loadingMsg.message_id);

    } catch (err) {
      console.error('FORMAT ERROR:', err);
      ctx.reply('שגיאה ביצירת הפורמט.');
    }
  });

  // Portfolio Callback
  bot.action(/^star_portfolio_/, async (ctx) => {
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
