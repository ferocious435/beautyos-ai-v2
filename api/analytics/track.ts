import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { eventType, masterId, clientId, district } = req.body;

  const supabase = getSupabase();
  if (!supabase) return res.status(500).send('Supabase connection failed');

  const { error } = await supabase.from('analytics_events').insert([{
    event_type: eventType,
    master_id: masterId,
    client_id: clientId,
    district: district
  }]);

  if (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
}
