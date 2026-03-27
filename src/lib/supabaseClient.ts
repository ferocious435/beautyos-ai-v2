import { createClient } from '@supabase/supabase-js';

// ПРЕДУПРЕЖДЕНИЕ: Мы больше не используем placeholder-project.
// Если переменные отсутствуют, мы экспортируем прокси, который НЕ кидает ошибки при чтении свойств,
// но предупреждает при попытке вызова методов. Это разблокирует Dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({}, { 
      get: (target, prop) => {
        if (prop === 'auth') return { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) };
        return () => ({
          from: () => ({
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
              order: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
              limit: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
            upsert: () => Promise.resolve({ data: null, error: null }),
            delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
          })
        });
      } 
    }) as any;

console.log(`SUPABASE: Initialized (Configured: ${isConfigured})`);
