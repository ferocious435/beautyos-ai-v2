import { createBot } from '../server/src/bot.js';
import { config } from 'dotenv';
import { VercelRequest, VercelResponse } from '@vercel/node';

config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing');
}

const bot = createBot(token);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('Error handling bot update:', err);
      res.status(500).send('Error');
    }
  } else {
    res.status(200).send('BeautyOS AI Bot Webhook is active!');
  }
}
