import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { iyzicoEventType, iyzicoReferenceCode } = body;

    console.log("[Iyzico Webhook]", iyzicoEventType, iyzicoReferenceCode);

    return NextResponse.json({ status: "OK" });
  } catch {
    return NextResponse.json({ status: "ERROR" }, { status: 400 });
  }
}
