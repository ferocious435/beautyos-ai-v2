import { createClient } from '@supabase/supabase-js';

// ПРЕДУПРЕЖДЕНИЕ: Приложение падает с черным экраном, если URL пуст. 
// Мы используем заглушки для локальной отладки/деплоя без переменных окружения.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Безопасная инициализация: если URL пуст или некорректен, создаем "холостой" клиент 
// или используем заглушку, чтобы не обрушить React-дерево при импорте.
const isConfigured = supabaseUrl && supabaseUrl.startsWith('https://');

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'no-key-provided');

console.log(`SUPABASE: Initialized (Configured: ${isConfigured})`);

