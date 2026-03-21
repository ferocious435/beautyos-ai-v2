import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createBot } from './bot.js';

config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => {
  res.send('BeautyOS AI v2 Server is healthy!');
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
