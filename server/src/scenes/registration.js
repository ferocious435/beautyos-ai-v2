import { Scenes } from 'telegraf';
import { supabase } from '../services/supabase.js';
export const REGISTRATION_SCENE = 'REGISTRATION_SCENE';
const ADMIN_ID = 305032473;
export const registrationScene = new Scenes.WizardScene(REGISTRATION_SCENE, 
// 1. Имя
async (ctx) => {
    await ctx.reply('✨ ברוכים הבאים ל-BeautyOS AI v2! ✨\nבואו נגדיר את הפרופיל המקצועי שלכם. איך קוראים לכם?');
    return ctx.wizard.next();
}, 
// 2. Название бизнеса
async (ctx) => {
    if (!ctx.message || !('text' in ctx.message))
        return ctx.reply('נא להזין שם.');
    ctx.wizard.state.name = ctx.message.text;
    await ctx.reply('מעולה! מה שם העסק שלכם? (למשל: "הסטודיо של שרה")');
    return ctx.wizard.next();
}, 
// 3. Телефон
async (ctx) => {
    if (!ctx.message || !('text' in ctx.message))
        return ctx.reply('נא להזין שם עסק.');
    ctx.wizard.state.businessName = ctx.message.text;
    await ctx.reply('מה מספר הטלפון שלכם ליצירת קשר?');
    return ctx.wizard.next();
}, 
// 4. Финализация и уведомление админа
async (ctx) => {
    if (!ctx.message || !('text' in ctx.message))
        return ctx.reply('נא להזין מספר טלפון.');
    const phone = ctx.message.text;
    const { name, businessName } = ctx.wizard.state;
    const telegramId = ctx.from?.id;
    try {
        if (supabase) {
            // Сохраняем как 'pending'
            const { error } = await supabase
                .from('masters')
                .insert([{
                    telegram_id: telegramId?.toString(),
                    name,
                    phone,
                    business_name: businessName,
                    status: 'pending' // По умолчанию
                }]);
            if (error)
                throw error;
        }
        await ctx.reply('🙏 תודה על ההרשמה! הבקשה שלך נשלחה למנהל המערכת לאישור. תקבל הודעה ברגע שהחשבון יופעל.');
        // Уведомляем админа
        await ctx.telegram.sendMessage(ADMIN_ID, `🔔 **בקשת הרשמה חדשה!**\n\n👤 שם: ${name}\n🏠 עסק: ${businessName}\n📱 טלפון: ${phone}\n🆔 ID: ${telegramId}`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ אשר משתמש', callback_data: `approve_${telegramId}` }],
                    [{ text: '❌ דחה', callback_data: `reject_${telegramId}` }]
                ]
            }
        });
        return ctx.scene.leave();
    }
    catch (error) {
        console.error('Registration Error:', error);
        await ctx.reply('חלה שגיאה קטנה. המנהל יעזור לך בהקדם!');
        return ctx.scene.leave();
    }
});
//# sourceMappingURL=registration.js.map