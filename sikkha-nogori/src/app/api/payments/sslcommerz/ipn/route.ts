import { createHash } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type ValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string | number;
  currency?: string;
  bank_tran_id?: string;
  risk_level?: string | number;
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = new URLSearchParams(rawBody);
  const merchantReference = payload.get("tran_id")?.trim() ?? "";
  const ipnStatus = payload.get("status")?.trim().toUpperCase() ?? "";
  const ipnAmount = Number(payload.get("amount"));
  const ipnCurrency = payload.get("currency")?.trim().toUpperCase() ?? "";
  const providerTransactionId =
    payload.get("bank_tran_id")?.trim() || merchantReference;
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();

  if (!storeId || !storePassword) {
    return json(503, { received: false, error: "gateway_not_configured" });
  }
  if (
    !/^[A-Za-z0-9_-]{8,30}$/.test(merchantReference) ||
    !Number.isFinite(ipnAmount) ||
    ipnAmount <= 0 ||
    ipnCurrency !== "BDT"
  ) {
    return json(400, { received: false, error: "invalid_notification" });
  }

  const sandbox = process.env.SSLCOMMERZ_IS_SANDBOX?.trim().toLowerCase() !== "false";
  const validationEndpoint = sandbox
    ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

  const supabase = createSupabaseServiceRoleClient();
  const { data: transaction, error: transactionError } = await supabase
    .from("payment_transactions")
    .select("id, merchant_reference, amount, currency, status")
    .eq("provider_code", "sslcommerz")
    .eq("merchant_reference", merchantReference)
    .maybeSingle();

  if (transactionError) {
    return json(500, { received: false, error: "transaction_lookup_failed" });
  }
  if (!transaction) {
    return json(404, { received: false, error: "transaction_not_found" });
  }
  if (
    Number(transaction.amount).toFixed(2) !== ipnAmount.toFixed(2) ||
    transaction.currency !== ipnCurrency
  ) {
    return json(202, { received: true, processed: false });
  }

  let validationId: string | null = null;
  let finalStatus = ipnStatus;
  let finalTransactionId = providerTransactionId;

  if (ipnStatus === "VALID" || ipnStatus === "VALIDATED") {
    const valId = payload.get("val_id")?.trim();
    if (!valId) {
      return json(202, { received: true, processed: false });
    }

    const validationUrl = new URL(validationEndpoint);
    validationUrl.search = new URLSearchParams({
      val_id: valId,
      store_id: storeId,
      store_passwd: storePassword,
      format: "json",
    }).toString();

    let validation: ValidationResponse;
    try {
      const validationResponse = await fetch(validationUrl, {
        method: "GET",
        cache: "no-store",
      });
      if (!validationResponse.ok) {
        return json(202, { received: true, processed: false });
      }
      validation = await validationResponse.json() as ValidationResponse;
    } catch {
      return json(503, { received: false, error: "validation_unavailable" });
    }

    if (
      !["VALID", "VALIDATED"].includes(validation.status ?? "") ||
      validation.tran_id !== merchantReference ||
      !validation.val_id ||
      Number(validation.amount).toFixed(2) !== Number(transaction.amount).toFixed(2) ||
      validation.currency?.toUpperCase() !== transaction.currency ||
      String(validation.risk_level ?? "0") === "1"
    ) {
      return json(202, { received: true, processed: false });
    }

    validationId = validation.val_id;
    finalStatus = validation.status;
    finalTransactionId = validation.bank_tran_id?.trim() || validation.tran_id || merchantReference;
  } else if (ipnStatus === "FAILED" || ipnStatus === "CANCELLED") {
    const queryUrl = new URL(
      sandbox
        ? "https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php"
        : "https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php",
    );
    queryUrl.search = new URLSearchParams({
      tran_id: merchantReference,
      store_id: storeId,
      store_passwd: storePassword,
      format: "json",
    }).toString();

    let queried: ValidationResponse;
    try {
      const queryResponse = await fetch(queryUrl, { method: "GET", cache: "no-store" });
      if (!queryResponse.ok) {
        return json(202, { received: true, processed: false });
      }
      queried = await queryResponse.json() as ValidationResponse;
    } catch {
      return json(503, { received: false, error: "status_query_unavailable" });
    }

    if (
      queried.tran_id !== merchantReference ||
      !["FAILED", "CANCELLED"].includes(queried.status ?? "") ||
      Number(queried.amount).toFixed(2) !== Number(transaction.amount).toFixed(2) ||
      queried.currency?.toUpperCase() !== transaction.currency
    ) {
      return json(202, { received: true, processed: false });
    }
    finalStatus = queried.status;
    finalTransactionId = queried.bank_tran_id?.trim() || queried.tran_id || merchantReference;
  } else {
    return json(202, { received: true, processed: false });
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const { data: processed, error: processingError } = await supabase.rpc(
    "complete_sslcommerz_payment",
    {
      p_merchant_reference: merchantReference,
      p_validation_id: validationId,
      p_provider_transaction_id: finalTransactionId,
      p_amount: ipnAmount,
      p_currency: ipnCurrency,
      p_provider_status: finalStatus,
      p_payload_hash: payloadHash,
    },
  );

  if (processingError) {
    return json(500, { received: false, error: "notification_processing_failed" });
  }
  return json(processed ? 200 : 202, { received: true, processed: Boolean(processed) });
}
