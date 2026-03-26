import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    console.warn('⚠️ SUPABASE_URL not configured');
    return null;
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export async function uploadToPortfolio(userId: number, imageBuffer: Buffer): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const fileName = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('portfolio')
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error('Storage upload error:', error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('portfolio')
    .getPublicUrl(fileName);

  return publicUrl;
}
