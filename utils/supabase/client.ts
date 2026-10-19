import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://yzapwulavlcxcgrdhnzz.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_5gaMxjI1XSmZIZ5NCZSdgQ_6Vzv7al5';

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
