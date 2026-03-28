import { Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { setupBotHandlers, supabaseSessionMiddleware, BotContext } from './_lib/bot-logic.js';

/**
 * BeautyOS AI Unified Bot Handler
 * Entry point for Vercel Serverless Function.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  if (!token) {
    return res.status(200).json({ status: 'error', message: 'Missing TELEGRAM_BOT_TOKEN' });
  }

  try {
    const bot = new Telegraf<BotContext>(token);
    
    // 1. Session & Persistence
    bot.use(supabaseSessionMiddleware);

    // 2. Core Handlers (Modular Logic)
    setupBotHandlers(bot);

    // 3. Vercel Webhook Integration
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } else {
      // Direct access (GET) triggers webhook sync
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'Bot is ALIVE and Unified!',
        version: '3.2.0-stabilized'
      });
    }
  } catch (err: any) {
    console.error('BOT HANDLER ERROR:', err);
    return res.status(200).json({ status: 'fault', error: err.message });
  }
}
