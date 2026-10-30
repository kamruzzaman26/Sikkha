import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productId,
    )
  ) {
    return NextResponse.json(
      { error: "Product not found." },
      { status: 404, headers: noStoreHeaders },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    throw new Error("Unable to verify product access.", { cause: userError });
  }
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required." },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("product_entitlements")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (entitlementError) {
    throw new Error("Unable to verify product entitlement.", {
      cause: entitlementError,
    });
  }
  if (!entitlement) {
    return NextResponse.json(
      { error: "Product not found." },
      { status: 404, headers: noStoreHeaders },
    );
  }

  const { data: resource, error: resourceError } = await supabase
    .from("product_resources")
    .select("storage_path")
    .eq("product_id", productId)
    .maybeSingle();

  if (resourceError) {
    throw new Error("Unable to load the entitled product resource.", {
      cause: resourceError,
    });
  }
  if (!resource) {
    return NextResponse.json(
      { error: "Product content is not available." },
      { status: 404, headers: noStoreHeaders },
    );
  }

  const { data: signedResource, error: signingError } = await supabase.storage
    .from("sikkha-protected-products")
    .createSignedUrl(resource.storage_path, 60);

  if (signingError) {
    console.error("Could not create an entitled product download URL.", signingError);
    return NextResponse.json(
      { error: "Product content is temporarily unavailable." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const response = NextResponse.redirect(signedResource.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
