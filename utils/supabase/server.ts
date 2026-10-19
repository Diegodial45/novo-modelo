import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://yzapwulavlcxcgrdhnzz.supabase.co';
const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_5gaMxjI1XSmZIZ5NCZSdgQ_6Vzv7al5';

export const createClient = (cookieStore: any) => {
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return typeof cookieStore?.getAll === 'function' ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore?.set === 'function') {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
