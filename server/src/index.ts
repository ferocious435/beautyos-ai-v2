import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createBot } from './bot.js';
import { GeminiService } from './services/geminiService.js';
import { PromptEngineService } from './services/promptEngine.js';

config();

const app = express();
const port = process.env.PORT || 3001;

// Инициализация сервисов
const geminiService = new GeminiService();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.send('BeautyOS AI v2 Server is healthy!');
});

// Новый API для Mini App (v2.2.6)
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, masterName = 'Beauty Master' } = req.body;
    if (!image) return res.status(400).send({ error: 'Image is required' });

    console.log('[API] Analysing image via Gemini...');
    
    // Очистка base64 от префикса
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Получение промпта
    const prompt = PromptEngineService.getHumanizedVisionPrompt(masterName);
    const result = await geminiService.analyzeImage(prompt, buffer, 'image/jpeg');
    
    console.log('[API] Gemini Response received.');

    // Попытка распарсить JSON из ответа Gemini
    let jsonResult;
    try {
      const sanitized = result.replace(/```json\n?|```/g, "").trim();
      jsonResult = JSON.parse(sanitized);
    } catch (e) {
      console.warn('[API] Gemini response is not valid JSON, returning as text');
      jsonResult = { instagram: result, facebook: result, whatsapp: result };
    }

    res.json(jsonResult);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан в .env');
  process.exit(1);
}

const bot = createBot(token);

app.listen(port, () => {
  console.log(`🚀 Сервер v2 запущен на порту ${port}`);
  
  bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
      console.log('✅ Вебхук удален, запуск Long Polling...');
      return bot.launch();
    })
    .then(() => {
      console.log('🤖 Бот BeautyOS AI v2 успешно запущен!');
    })
    .catch((err: any) => {
      console.error('❌ Ошибка при запуске бота:', err);
    });
});

process.once('SIGINT', () => {
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  process.exit(0);
});
