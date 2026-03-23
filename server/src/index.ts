import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createBot } from './bot.js';
import { GeminiService } from './services/geminiService.js';
import { PromptEngineService } from './services/promptEngine.js';
import { trendAnalyzer } from './services/trendAnalyzer.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Инициализация сервисов
const geminiService = new GeminiService();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Увеличен лимит для качественных фото

app.get('/health', (req, res) => {
  res.send('BeautyOS AI v2 Server is healthy and running Nano-Banana!');
});

// Новый API для Mini App (v2.2.6) - Анализ контента
app.post('/api/analyze', async (req, res) => {
  try {
    const { image, masterName = 'Beauty Master' } = req.body;
    if (!image) return res.status(400).send({ error: 'Image is required' });

    console.log('[API] Analysing image via Gemini for content...');
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const prompt = PromptEngineService.getHumanizedVisionPrompt(masterName);
    const result = await geminiService.analyzeImage(prompt, buffer, 'image/jpeg');
    
    let jsonResult;
    try {
      const sanitized = result.replace(/```json\n?|```/g, "").trim();
      jsonResult = JSON.parse(sanitized);
    } catch (e) {
      jsonResult = { instagram: result, facebook: result, whatsapp: result };
    }
    res.json(jsonResult);
  } catch (error: any) {
    console.error('API Error (Analyze):', error);
    res.status(500).json({ error: error.message });
  }
});

// Эндпоинт для профессиональной реконструкции фото (Nano-Banana)
app.post('/api/enhance', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send({ error: 'Image is required' });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key missing in .env');

    console.log('[API] Nano-Banana Reconstruction started using local skill...');

    const tempDir = tmpdir();
    const inputPath = join(tempDir, `enhance_in_${Date.now()}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    // Use RELATIVE path to the skill from the server/src directory
    const skillScript = join(__dirname, '../../skills/ai-studio-image/scripts/generate.py');
    
    // Тот самый промпт на иврите для мастера ногтевого сервиса
    const hebrewPrompt = `
ערוך את התמונה המצורפת והפוך אותה לתמונת פרסום מקצועית לאינסטגרם עבור עסק בתחום הציפורניים.
מטרת העריכה: לשפר משמעותית את איכות התמונה בלי לשנות את מבנה הידיים, צורת הציפורניים או מראה העבודה בפועל. לשמור על מראה ריאליסטי, נקי, יוקרתי ומסחרי.
הנחיות מדויקות:
- שפר חדות בצורה מקצועית ועדינה, עם דגש על פרטי הציפורניים, הברק, קווי הפרנץ' ומרקם העור.
- בצע ניקוי רעשים, שיפור רזולוציה והבהרת פרטים קטנים בלי ליצור מראה מלאכותי.
- תקן צבעים ואיזון לבן כך שגוון העור ייראה טבעי, נקי ומחמיא, והוורוד/לבן של הציפורניים ייראה מדויק, רך ויוקרתי.
- שפר תאורה וצללים: תאורה רכה, מחמיאה ואחידה, עם עומק עדין וצללים נקיים שמדגישים את העבודה.
- נקה את הרקע והפוך אותו לאסתטי, אחיד ומקצועי.
- שמור על מראה נקי של עור הידיים, אך בלי אפקט פלסטיק.
- שמור על פרופורציות אמיתיות לחלוטין.
- תן לתמונה תחושה של צילום ביוטי מקצועי לסטודיו/קוסמטיקה/מניקור.
- הפלט צריך להיראות כמו מודעת פרסום מקצועית מוכנה לאינסטגרם בפורמט 4:5.
שלילה: בלי לשנות את עיצוב הציפורניים, בלי להמציא פרטים חדשים, בלי פילטרים מוגזמים, בלי מראה קרטוני, בלי oversmooth, בלי HDR מוגזם, בלי צבעי עור לא טבעיים, בלי טקסט על התמונה.
    `.trim().replace(/"/g, "'").replace(/\n/g, ' ');

    const command = [
      `python "${skillScript}"`,
      `--prompt "${hebrewPrompt}"`,
      `--reference-images "${inputPath}"`,
      '--model gemini-pro-image',
      '--mode influencer',
      '--format portrait',
      '--humanization polished',
      '--force-paid',
      '--json'
    ].join(' ');

    const resultJson = execSync(command, { 
      env: { ...process.env, GEMINI_API_KEY: apiKey },
      encoding: 'utf-8' 
    });

    const parsedResult = JSON.parse(resultJson);
    if (!parsedResult.generated || parsedResult.generated.length === 0) {
        throw new Error('AI reconstruction failed to produce an image. Check API key and prompts.');
    }
    
    const generatedPath = parsedResult.generated[0];
    const enhancedBuffer = readFileSync(generatedPath);
    const enhancedBase64 = `data:image/png;base64,${enhancedBuffer.toString('base64')}`;

    console.log('[API] Nano-Banana Reconstruction complete.');

    res.json({
      enhancedImage: enhancedBase64,
      ai_report: "בוצע שחזור Nano-Banana מלא: חדות קריסטלית, ניקוי רקע ותאורת סטודיו יוקרתית.",
      brightness: 100, contrast: 100, saturate: 100, sharpen: 0, shadows: 0
    });
  } catch (error: any) {
    console.error('API Error (Enhance):', error);
    res.status(500).json({ error: error.message });
  }
});

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан в .env');
  process.exit(1);
}

const bot = createBot(token);

trendAnalyzer.init().then(() => {
  cron.schedule('0 9 * * 1', async () => {
    try {
      await trendAnalyzer.runWeeklyAnalysis();
    } catch (e) {
      console.error('❌ Ошибка при сканировании трендов', e);
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Сервер BeautyOS v2 запущен на порту ${port}`);
  bot.telegram.deleteWebhook({ drop_pending_updates: true })
    .then(() => {
      console.log('✅ Вебхук удален, запуск Long Polling...');
      return bot.launch();
    })
    .catch((err: any) => {
      console.error('❌ Ошибка при запуске бота:', err);
    });
});

process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(0); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(0); });
