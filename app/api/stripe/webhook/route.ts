import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// O webhook não tem sessão de usuário — usa a service role key.
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whSecret) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const stripe = new Stripe(key);
  const body = await req.text(); // corpo cru: obrigatório para validar a assinatura
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const db = createAdminClient();

  async function setByCustomer(customerId: string, patch: Record<string, unknown>) {
    await db.from("profiles").update(patch).eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.user_id;
      const patch = {
        subscription_status: "active",
        stripe_customer_id: s.customer as string,
        stripe_subscription_id: s.subscription as string,
      };
      if (userId) await db.from("profiles").update(patch).eq("id", userId);
      else if (s.customer) await setByCustomer(s.customer as string, patch);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      // active | trialing | past_due | canceled | unpaid | incomplete
      await setByCustomer(sub.customer as string, {
        subscription_status: sub.status,
        stripe_subscription_id: sub.id,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await setByCustomer(sub.customer as string, { subscription_status: "canceled" });
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.customer) await setByCustomer(inv.customer as string, { subscription_status: "past_due" });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
