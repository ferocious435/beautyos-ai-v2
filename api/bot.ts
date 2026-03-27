import { Telegraf, session, Markup, Scenes, Context } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// --- CONFIG & CONSTANTS ---
const CONFIG = {
  MODELS: {
    ANALYSIS: 'gemini-1.5-flash', 
    ENHANCEMENT: 'imagen-3.0-generate-001',
  }
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface BotContext extends Context {
  session: any;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}

// --- HANDLER ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const WEBAPP_URL = process.env.WEBAPP_URL || 'https://beautyos-ai-v2.vercel.app';

  if (!token) {
    return res.status(200).json({ status: 'error', message: 'Missing TELEGRAM_BOT_TOKEN' });
  }

  try {
    const bot = new Telegraf<BotContext>(token);
    bot.use(session());

    // Simple Start
    bot.start((ctx) => {
      return ctx.replyWithHTML(
        '✨ <b>ברוכים הבאים ל-BeautyOS AI v2</b> ✨\n\n' +
        'העוזר החכם שלך בשניות.\n\n' +
        '📸 <b>טיפ:</b> שלחו לי תמונה!',
        {
          reply_markup: {
            keyboard: [[{ text: '✨ סטודיו AI', web_app: { url: `${WEBAPP_URL}/?v=${Date.now()}` } }]],
            resize_keyboard: true
          }
        }
      );
    });

    // Basic Photo Handler (Minimal version for stability)
    bot.on('photo', async (ctx) => {
       await ctx.reply('⏳ מנתח את התמונה... (מצב יציבות فعال)');
    });

    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } else {
      await bot.telegram.setWebhook(`${WEBAPP_URL}/api/bot`);
      return res.status(200).json({ 
        status: 'success', 
        message: 'Bot is ALIVE and Monolithic!',
        version: '3.0.0-resilient'
      });
    }
  } catch (err: any) {
    console.error('MONOLITH ERROR:', err);
    return res.status(200).json({ status: 'fault', error: err.message });
  }
}
