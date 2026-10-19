import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Novas credenciais fornecidas pelo usuário
export const DEFAULT_SUPABASE_URL = 'https://yzapwulavlcxcgrdhnzz.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_5gaMxjI1XSmZIZ5NCZSdgQ_6Vzv7al5';

const STORAGE_KEY_URL = 'sertao_custom_supabase_url';
const STORAGE_KEY_KEY = 'sertao_custom_supabase_key';

export function getSupabaseConfig(): { url: string; key: string; isCustom: boolean } {
  try {
    const savedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
    const savedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

    if (savedUrl && savedKey) {
      return { url: savedUrl.trim(), key: savedKey.trim(), isCustom: true };
    }
  } catch (e) {
    // Ignore storage errors
  }

  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL);

  const envKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return {
    url: (envUrl || DEFAULT_SUPABASE_URL).trim(),
    key: (envKey || DEFAULT_SUPABASE_KEY).trim(),
    isCustom: false
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  } catch (e) {
    console.error('Failed to save Supabase config to localStorage', e);
  }
  initSupabase(url.trim(), key.trim());
}

export function resetSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  } catch (e) {
    console.error('Failed to reset Supabase config', e);
  }
  initSupabase(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
}

let currentClient: SupabaseClient = createClient(
  getSupabaseConfig().url,
  getSupabaseConfig().key
);

export function initSupabase(url: string, key: string): SupabaseClient {
  currentClient = createClient(url, key);
  return currentClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = currentClient as any;
    const val = client[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  }
});

export interface ConnectionTestResult {
  connected: boolean;
  status: 'connected' | 'table_missing' | 'disconnected' | 'invalid_key' | 'paused' | 'testing';
  message: string;
  missingTables?: string[];
  latencyMs?: number;
}

export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  try {
    const config = getSupabaseConfig();
    const testClient = createClient(config.url, config.key);

    // Try a ping to test reachability
    const res = await testClient.from('menu_items').select('id').limit(1);
    const latency = Date.now() - startTime;

    if (!res.error) {
      return {
        connected: true,
        status: 'connected',
        message: `Conexão bem sucedida com Supabase (${latency}ms)! Todas as tabelas prontas.`,
        latencyMs: latency
      };
    }

    const errCode = (res.error as any).code || '';
    const errMsg = res.error.message || '';

    // PGRST205 / PGRST204 means connected to Supabase successfully, but table doesn't exist yet
    if (errCode === 'PGRST205' || errCode === 'PGRST204' || errMsg.includes('Could not find the table') || errMsg.includes('relation "public.menu_items" does not exist')) {
      return {
        connected: true,
        status: 'table_missing',
        message: 'Conectado ao Supabase! Porém as tabelas ainda precisam ser criadas no SQL Editor.',
        latencyMs: latency
      };
    }

    if (errCode === 'PGRST301' || errMsg.includes('JWT') || errMsg.includes('apikey')) {
      return {
        connected: false,
        status: 'invalid_key',
        message: 'Chave do Supabase inválida ou expirada. Verifique a anon/public key.',
        latencyMs: latency
      };
    }

    return {
      connected: false,
      status: 'disconnected',
      message: `Erro ao conectar: ${errMsg || 'Servidor inacessível'}`,
      latencyMs: latency
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return {
      connected: false,
      status: 'disconnected',
      message: `Falha de rede ou host inexistente: ${err?.message || err}`,
      latencyMs: latency
    };
  }
}
