import { NextResponse } from "next/server";

// Browser returns are informational only. Payment is confirmed exclusively by
// the server-to-server IPN after the SSLCOMMERZ Validation API succeeds.
function returnToOrders(request: Request) {
  return NextResponse.redirect(
    new URL("/account/orders?status=payment-returned", request.url),
    303,
  );
}

export async function GET(request: Request) {
  return returnToOrders(request);
}

export async function POST(request: Request) {
  await request.text();
  return returnToOrders(request);
}
