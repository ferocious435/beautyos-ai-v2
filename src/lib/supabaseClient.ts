/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

/**
 * Идеальный цепной прокси для работы без БД.
 * Поддерживает бесконечные вызовы: supabase.from('...').select().eq().single()
 * И ведет себя как Promise для await.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createChainProxy = (): any => {
    // В основе лежит функция, которая при вызове возвращает саму себя (этот же прокси)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target: any = () => proxy;
    
    // Эмуляция промиса
    target.then = (onRes: unknown) => Promise.resolve({ data: null, error: null }).then(onRes);
    target.catch = (onErr: unknown) => Promise.resolve({ data: null, error: null }).catch(onErr);

    const proxy = new Proxy(target, {
        get: (t, prop) => {
            if (prop === 'then') return t.then;
            if (prop === 'catch') return t.catch;
            // Любое свойство (.from, .select, .eq) возвращает этот же прокси
            return proxy;
        }
    });

    return proxy;
};

const silentProxy = new Proxy({}, { 
    get: (_target, prop) => {
        if (prop === 'auth') return { 
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signOut: () => Promise.resolve({ error: null })
        };
        // Любой доступ к свойствам (from, select) возвращает цепной прокси
        return createChainProxy();
    } 
}) as any;

export const supabase = isConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : silentProxy;

console.log(`SUPABASE: 2026 Resilient Engine Initialized (Configured: ${isConfigured})`);
