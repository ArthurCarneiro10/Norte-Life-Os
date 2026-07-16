import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) {
    return NextResponse.json({ error: "Stripe não configurado." }, { status: 500 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const stripe = new Stripe(key);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // reaproveita o customer se já existir
  const { data: prof } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = prof?.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    // Sem trial. Para ligar depois, basta:
    // subscription_data: { trial_period_days: 7 },
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/app?checkout=cancel`,
    locale: "pt-BR",
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
