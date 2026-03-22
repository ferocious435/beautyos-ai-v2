import fs from 'fs/promises';
import path from 'path';
import { geminiService } from './geminiService.js';
const TRENDS_FILE = path.join(process.cwd(), 'data', 'weekly_trends.json');
export class TrendAnalyzerService {
    currentTrend = null;
    async init() {
        try {
            const data = await fs.readFile(TRENDS_FILE, 'utf-8');
            this.currentTrend = JSON.parse(data);
            console.log('✅ Последние тренды рынка загружены успешно.');
        }
        catch (e) {
            console.log('ℹ️ Файл трендов не найден. Выполните генерацию трендов.');
        }
    }
    async runWeeklyAnalysis(telegramContext) {
        const prompt = `
Ты — AI-исследователь рынка в нише Beauty-индустрии (маникюр, педикюр, ресницы, массаж).
Проведи симуляцию глубокой разведки по самым популярным постам и Reels в текущих условиях. 
Выяви актуальные тренды на эту неделю.

Верни ТОЛЬКО валидный JSON со следующими полями:
1. "visualAnchors": Описание стиля съёмки, освещения, цветокоррекции, которые вызывают ощущение «дорогого» сервиса именно сейчас.
2. "semanticAnchors": Фразы или обещания конкурентов, заставляющие записываться.
3. "hiddenDeficits": Вопросы/боли клиентов из комментариев (например, долгая процедура, плохая стерилизация), на которые мастера не дают ответа.
4. "postTemplate": Готовый универсальный каркас поста, закрывающий эти боли, написанный живым языком (сохрани экспертность, без шаблонов "мы лучшие").
5. "mediaProductionPrompt": Промпт для генерации картинки или видео (Reels), раскрывающей суть услуги и закрывающей эти боли.
`;
        if (telegramContext) {
            telegramContext.reply("🔍 Начинаю глубокое сканирование и анализ рынка (Weekly Trend Analyzer)... Ожидайте...");
        }
        try {
            const resultText = await geminiService.generateText(prompt, "Ты - эксперт-аналитик бьюти сферы. Отвечай только строгим JSON.");
            const cleanText = resultText.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanText);
            const trend = {
                timestamp: new Date().toISOString(),
                visualAnchors: data.visualAnchors,
                semanticAnchors: data.semanticAnchors,
                hiddenDeficits: data.hiddenDeficits,
                postTemplate: data.postTemplate,
                mediaProductionPrompt: data.mediaProductionPrompt
            };
            this.currentTrend = trend;
            try {
                await fs.mkdir(path.dirname(TRENDS_FILE), { recursive: true });
                await fs.writeFile(TRENDS_FILE, JSON.stringify(trend, null, 2), 'utf-8');
            }
            catch (e) {
                console.error("Ошибка сохранения трендов:", e);
            }
            if (telegramContext) {
                const report = `📊 *Анализ рынка завершен!*\n\n` +
                    `👁 *Визуальные якоря (Тренд недели):*\n${trend.visualAnchors}\n\n` +
                    `💡 *Смысловые якоря:*\n${trend.semanticAnchors}\n\n` +
                    `🎯 *Скрытый дефицит (боли):*\n${trend.hiddenDeficits}\n\n` +
                    `📝 *Скелет постов:*\n${trend.postTemplate}\n\n` +
                    `🎬 *Промпт для медиа:*\n${trend.mediaProductionPrompt}`;
                await telegramContext.reply(report, { parse_mode: 'Markdown' });
            }
            return trend;
        }
        catch (error) {
            console.error("Ошибка при генерации трендов:", error);
            if (telegramContext) {
                telegramContext.reply("❌ Ошибка при генерации еженедельных трендов. Проверьте логи на сервере.");
            }
            throw error;
        }
    }
    getLatestTrends() {
        return this.currentTrend;
    }
}
export const trendAnalyzer = new TrendAnalyzerService();
//# sourceMappingURL=trendAnalyzer.js.map