import { createClient } from '@supabase/supabase-js';

// ПРЕДУПРЕЖДЕНИЕ: Приложение падает с черным экраном, если URL пуст. 
// Мы используем заглушки для локальной отладки/деплоя без переменных окружения.
// ПРЕДУПРЕЖДЕНИЕ: Мы больше не используем placeholder-project, так как это вызывает ERR_NAME_NOT_RESOLVED.
// Если переменные отсутствуют, мы экспортируем "пустой" клиент или прокси.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({}, { 
      get: () => () => { throw new Error("Supabase is not configured. Please set environment variables."); } 
    }) as any;

console.log(`SUPABASE: Initialized (Configured: ${!!(supabaseUrl && supabaseAnonKey)})`);


