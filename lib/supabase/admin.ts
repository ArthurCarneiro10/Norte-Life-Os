import { createClient } from "@supabase/supabase-js";

// Cliente administrativo — SOMENTE no servidor (webhooks).
// Usa a service role key: ignora RLS. Nunca importe isto em componentes client.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
