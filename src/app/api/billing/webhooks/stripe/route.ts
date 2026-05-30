import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const sig = request.headers.get("stripe-signature");
    const body = await request.text();

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );

    switch (event.type) {
      case "checkout.session.completed":
        console.log("[Stripe] Payment completed:", event.data.object);
        break;
      case "invoice.paid":
        console.log("[Stripe] Invoice paid:", event.data.object);
        break;
      case "customer.subscription.deleted":
        console.log("[Stripe] Subscription cancelled:", event.data.object);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook Error]", err);
    return NextResponse.json(
      { error: "Webhook error" },
      { status: 400 },
    );
  }
}
