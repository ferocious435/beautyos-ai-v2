import { Markup } from "telegraf";
import { supabase } from "../services/supabase.js";
import { geminiService } from "../services/geminiService.js";
import { socialService } from "../services/socialService.js";
import { PromptEngineService } from "../services/promptEngine.js";
import axios from 'axios';
// Вспомогательная функция для парсинга ответов AI
function parseCaptions(text) {
    const result = { ig: '', fb: '', wa: '' };
    try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanText);
        result.ig = data.instagram || data.Instagram || '';
        result.fb = data.facebook || data.Facebook || '';
        result.wa = data.whatsapp || data.WhatsApp || '';
    }
    catch (e) {
        const parts = text.split(/Instagram:|Facebook:|WhatsApp:/i);
        if (parts.length >= 4) {
            result.ig = parts[1]?.trim() || '';
            result.fb = parts[2]?.trim() || '';
            result.wa = parts[3]?.trim() || '';
        }
        else {
            result.ig = text.substring(0, 500);
            result.fb = text.substring(0, 500);
            result.wa = text.substring(0, 500);
        }
    }
    return result;
}
export function setupPhotoHandler(bot) {
    const lastGenerated = {};
    bot.on("photo", async (ctx) => {
        const telegramId = ctx.from?.id;
        if (!telegramId)
            return;
        if (!supabase) {
            return ctx.reply("⚠️ המערכת בבניה (Supabase לא מוגדר).");
        }
        const { data: master, error: masterError } = await supabase
            .from('masters')
            .select('id, name')
            .eq('telegram_id', telegramId.toString())
            .single();
        if (masterError || !master) {
            return ctx.reply("❌ השירות זמין רק למשתמשים רשומים. נא להירשם בתפריט הראשי.");
        }
        const photo = ctx.message.photo.pop();
        if (!photo)
            return;
        const processingMsg = await ctx.reply("⏳ משפר את התמונה באמצעות Nano Banana... ✨");
        try {
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);
            const imageUrl = fileLink.href;
            let enhancedUrl = imageUrl;
            try {
                const nanoResponse = await axios.post("https://api.nanobananaapi.ai/v1/enhance", {
                    image_url: imageUrl,
                    model: "nano-banana-2",
                    options: { skin_smoothing: 50, lighting_correction: true }
                }, {
                    headers: { "Authorization": `Bearer ${process.env.NANO_BANANA_API_KEY}` }
                });
                enhancedUrl = nanoResponse.data.output_url || imageUrl;
            }
            catch (err) {
                console.warn('⚠️ Nano Banana Error:', err);
            }
            await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, "🎨 כותב פוסטים באמצעות Gemini 3.1 Pro... ✍️");
            const visionPrompt = PromptEngineService.getHumanizedVisionPrompt(master.name);
            const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const aiResponse = await geminiService.analyzeImage(visionPrompt, Buffer.from(imgResp.data), "image/jpeg");
            const captions = parseCaptions(aiResponse);
            lastGenerated[telegramId] = { imageUrl: enhancedUrl, captions };
            await supabase.from('portfolio').insert([{
                    master_id: master.id,
                    image_url: enhancedUrl,
                    caption: aiResponse,
                    original_photo_id: photo.file_id
                }]);
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp("✨ עריכה בסטודיו (Mini App)", `https://beautyos-ai-v2.vercel.app/?photo=${encodeURIComponent(enhancedUrl)}`)],
                [Markup.button.callback("📸 פרסום באינסטגרם", "publish_ig")],
                [Markup.button.callback("👥 פרסום בפייסבוק", "publish_fb")],
                [Markup.button.callback("❌ ביטול", "cancel_posts")],
            ]);
            await ctx.replyWithPhoto(enhancedUrl, {
                caption: `🚀 *הפוסטים מוכנים!*\n\n📸 *Instagram*:\n${captions.ig?.substring(0, 100)}...\n\n👥 *Facebook*:\n${captions.fb?.substring(0, 100)}...`,
                parse_mode: 'Markdown',
                ...keyboard
            });
            await ctx.deleteMessage(processingMsg.message_id).catch(() => { });
        }
        catch (error) {
            console.error('PhotoHandler Error:', error);
            await ctx.reply("❌ Ошибка обработки.");
        }
    });
    bot.action('publish_ig', async (ctx) => {
        const data = lastGenerated[ctx.from.id];
        if (!data)
            return ctx.answerCbQuery("❌ Ошибка.");
        await ctx.answerCbQuery("Публикуем...");
        const result = await socialService.publishToInstagram(data.imageUrl, data.captions.ig || '');
        ctx.reply(result.success ? `✅ Опубликовано!` : `❌ Ошибка: ${result.error}`);
    });
    bot.action('publish_fb', async (ctx) => {
        const data = lastGenerated[ctx.from.id];
        if (!data)
            return ctx.answerCbQuery("❌ Ошибка.");
        await ctx.answerCbQuery("Публикуем...");
        const result = await socialService.publishToFacebook(data.imageUrl, data.captions.fb || '');
        ctx.reply(result.success ? `✅ Опубликовано!` : `❌ Ошибка: ${result.error}`);
    });
    bot.action('copy_wa', async (ctx) => {
        const data = lastGenerated[ctx.from.id];
        if (data)
            ctx.reply(`*WhatsApp*:\n\n${data.captions.wa}`, { parse_mode: 'Markdown' });
        ctx.answerCbQuery();
    });
    bot.action('cancel_posts', (ctx) => {
        ctx.answerCbQuery();
        ctx.reply("Отменено.");
    });
}
//# sourceMappingURL=photoHandler.js.map