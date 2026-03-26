import { Telegraf } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  // DIAGNOSTIC MODE: No external imports from ./lib/
  console.log('DIAGNOSTIC BOT: Start');

  if (!token) {
    return res.status(200).json({ 
      status: 'diagnostic', 
      message: 'TELEGRAM_BOT_TOKEN is missing',
      env_keys: Object.keys(process.env).filter(k => k.includes('BOT') || k.includes('SUPABASE'))
    });
  }

  try {
    const bot = new Telegraf(token);
    
    bot.start((ctx) => ctx.reply('BeautyOS Diagnostic: Online!'));

    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } else {
      return res.status(200).json({ 
        status: 'diagnostic', 
        message: 'Bot is ready (GET bypass)',
        token_length: token.length
      });
    }
  } catch (err: any) {
    return res.status(200).json({ status: 'diagnostic_error', error: err.message });
  }
}
