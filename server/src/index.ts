import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createBot } from './bot.js';
import { trendAnalyzer } from './services/trendAnalyzer.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.send('BeautyOS AI v2 Server is healthy and running on Vercel!');
});

// Nano-Banana V2: 3 Formats + Text Overlay
app.post('/api/enhance', async (req, res) => {
  try {
    const { image, studioName = 'סטודיו ליופי', address = 'הזמינו תור עכשיו' } = req.body;
    if (!image) return res.status(400).send({ error: 'Image is required' });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key missing in .env');

    console.log(`[API] Processing 3 formats for ${studioName}...`);

    const tempDir = tmpdir();
    const inputPath = join(tempDir, `in_${Date.now()}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    const projectRoot = join(__dirname, '../../');
    const generateScript = join(projectRoot, 'skills/ai-studio-image/scripts/generate.py');
    const overlayScript = join(projectRoot, 'skills/ai-studio-image/scripts/overlay.py');

    if (!existsSync(generateScript)) throw new Error('AI Engine script not found');

    // 1. Generate 3 formats (Square, Portrait, Story)
    const formats = ['square', 'portrait', 'story'];
    const enhancedImages: string[] = [];

    for (const format of formats) {
      console.log(`[AI] Generating ${format}...`);
      const command = [
        `python "${generateScript}"`,
        `--reference-images "${inputPath}"`,
        `--format ${format}`,
        '--model gemini-pro-image',
        '--force-paid',
        '--json'
      ].join(' ');

      const result = execSync(command, { 
        env: { ...process.env, GEMINI_API_KEY: apiKey },
        encoding: 'utf-8' 
      });
      
      const parsed = JSON.parse(result);
      let photoPath = parsed.generated[0];

      // 2. Apply Text Overlay
      console.log(`[AI] Applying overlay for ${format}...`);
      const overlayCommand = [
        `python "${overlayScript}"`,
        `--image "${photoPath}"`,
        `--studio "${studioName}"`,
        `--address "${address}"`
      ].join(' ');

      execSync(overlayCommand, { encoding: 'utf-8' });

      // Load back processed image
      const buffer = readFileSync(photoPath);
      enhancedImages.push(`data:image/png;base64,${buffer.toString('base64')}`);
    }

    res.json({
      enhancedImages,
      ai_report: "בוצע שחזור מלא ב-3 פורמטים עם חתימת הסטודיו שלך."
    });

  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bot Integration
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing');
  process.exit(1);
}

const bot = createBot(token);

// WEBHOOK CONFIG (Critical for Vercel)
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

if (process.env.VERCEL) {
  console.log('🌐 Configuring Webhook for Vercel...');
  app.use(bot.webhookCallback('/api/bot'));
  bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
} else {
  console.log('🤖 Running in Long Polling mode (Local)...');
  bot.launch();
}

trendAnalyzer.init();

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
