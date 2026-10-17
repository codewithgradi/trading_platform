import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfigured, supabaseKey } from "@/lib/auth-core";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  if (!supabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey(), {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components cannot set cookies; proxy refreshes the session. */ }
      },
    },
  });
}
