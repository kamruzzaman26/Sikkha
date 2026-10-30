import "server-only";

import { createSupabasePublicServerClient } from "@/lib/supabase/server";
import type { CatalogProduct } from "@/lib/catalog";
import {
  getEnabledPaymentMethods,
  type PublicPaymentMethod,
} from "@/lib/supabase/payment-methods";

export type CheckoutProduct = Pick<
  CatalogProduct,
  "id" | "title" | "description" | "product_type"
> & { price: number };

export async function getCheckoutOptions(): Promise<{
  products: CheckoutProduct[] | null;
  paymentMethods: PublicPaymentMethod[] | null;
}> {
  const supabase = createSupabasePublicServerClient();
  const [productsResult, paymentMethods] = await Promise.all([
    supabase
      .from("products")
      .select("id, title, description, price, product_type")
      .eq("is_published", true)
      .is("archived_at", null)
      .eq("commerce_mode", "direct")
      .gte("price", 0)
      .order("title", { ascending: true })
      .limit(100),
    getEnabledPaymentMethods(),
  ]);

  if (productsResult.error) {
    if (
      ["42P01", "42703", "PGRST204", "PGRST205"].includes(
        productsResult.error.code ?? "",
      )
    ) {
      console.error(
        "Product-catalog migration is missing from the configured database.",
        productsResult.error,
      );
      return { products: null, paymentMethods };
    }
    throw new Error("Unable to load checkout products.", {
      cause: productsResult.error,
    });
  }

  const products = productsResult.data.map((product) => {
    if (product.price === null) {
      throw new Error(
        "A direct-sale checkout product is missing its required price.",
      );
    }

    return { ...product, price: product.price };
  });

  return { products, paymentMethods };
}
