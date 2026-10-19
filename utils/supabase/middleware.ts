import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://yzapwulavlcxcgrdhnzz.supabase.co';
const supabaseKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_5gaMxjI1XSmZIZ5NCZSdgQ_6Vzv7al5';

export const createClient = (request: any, response: any = null) => {
  let supabaseResponse = response;

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return typeof request?.cookies?.getAll === 'function' ? request.cookies.getAll() : [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (typeof request?.cookies?.set === 'function') {
              request.cookies.set(name, value);
            }
            if (typeof supabaseResponse?.cookies?.set === 'function') {
              supabaseResponse.cookies.set(name, value, options);
            }
          });
        },
      },
    },
  );

  return supabaseResponse ? supabaseResponse : supabase;
};
