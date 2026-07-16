import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { Paywall } from "@/components/Paywall";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const status = profile?.subscription_status ?? "inactive";
  // Sem trial: só 'active' passa. (Para aceitar trial no futuro, inclua 'trialing'.)
  const allowed = status === "active";

  if (!allowed) {
    return (
      <div className="shell">
        <Paywall status={status} />
      </div>
    );
  }

  return (
    <div className="shell">
      {children}
      <Nav />
    </div>
  );
}
