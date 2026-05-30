import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { event_type, resource } = body;

    console.log("[PayPal Webhook]", event_type, resource?.id);

    switch (event_type) {
      case "PAYMENT.SALE.COMPLETED":
        console.log("[PayPal] Payment completed:", resource);
        break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log("[PayPal] Subscription cancelled:", resource);
        break;
    }

    return NextResponse.json({ status: "OK" });
  } catch {
    return NextResponse.json({ status: "ERROR" }, { status: 400 });
  }
}
