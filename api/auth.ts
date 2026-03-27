import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { getSupabase } from './lib/supabase.js';

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 * Official method: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * 
 * Skill applied: telegram-mini-app (Sharp Edge: "Not validating initData = HIGH severity")
 */
function validateInitData(initData: string, botToken: string): { valid: boolean; data: Record<string, string> } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false, data: {} };

    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const data: Record<string, string> = {};
    for (const [k, v] of entries) {
      data[k] = v;
    }

    return { valid: calculatedHash === hash, data };
  } catch {
    return { valid: false, data: {} };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'Missing initData' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: 'Bot token not configured' });

    // 1. Validate Telegram initData (HMAC-SHA256)
    const { valid, data } = validateInitData(initData, botToken);
    if (!valid) return res.status(401).json({ error: 'Invalid initData' });

    // 2. Extract user data
    let user: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string };
    try {
      user = JSON.parse(data.user || '{}');
    } catch {
      return res.status(400).json({ error: 'Invalid user data' });
    }

    if (!user.id) return res.status(400).json({ error: 'Missing user ID' });

    // 3. Upsert to Supabase (if configured)
    const supabase = getSupabase();
    let dbUser = null;

    if (supabase) {
      const { data: existing, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

      if (existing) {
        // Update last_seen
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('telegram_id', user.id);
        dbUser = existing;
      } else {
        // Insert new user
        const { data: newUser, error: insertErr } = await supabase
          .from('users')
          .insert({
            telegram_id: user.id,
            first_name: user.first_name,
            last_name: user.last_name || null,
            username: user.username || null,
            language_code: user.language_code || 'he',
            role: 'client',
            last_seen: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertErr) console.error('Insert error:', insertErr);
        dbUser = newUser;
      }
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
        role: dbUser?.role || 'client',
      },
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
