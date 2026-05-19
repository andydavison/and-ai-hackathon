import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/** Service-role client — bypasses RLS. Only use in server actions / server code. */
export function createAdminClient() {
  const { supabaseSecretKey } = getServerEnv();
  return createSupabaseClient<Database>(env.supabaseUrl, supabaseSecretKey);
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored as you have middleware refreshing user sessions
          }
        },
      },
    },
  );
}
