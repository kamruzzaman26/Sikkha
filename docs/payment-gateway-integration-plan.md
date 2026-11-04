# Payment Gateway Integration Plan

Status: design only. No provider selected, no merchant credentials, no live gateway enabled.

## Audited baseline (branch `merge-auth-otp`)

- Checkout calls `place_order_with_referral`, which calls `place_order` and returns an order UUID.
- `place_order` recalculates totals from published product prices, enforces idempotency per customer, and currently accepts only enabled `manual` and `cod` methods.
- `orders.payment_method_type` is constrained to `manual` or `cod`; `payment_methods` has a check preventing an enabled `gateway` method.
- Existing order payment statuses: `awaiting`, `submitted`, `verified`, `rejected`, `failed`, `cancelled`, `refunded`.
- Manual payment references are submitted by the customer and reviewed by an admin. COD is verified only after delivery.
- Admin order status and payment-review operations use SECURITY DEFINER RPCs and explicit authorization checks.
- Affiliate referral creation is coupled to order creation; conversion currently follows the order's payment status. Gateway settlement must update this same canonical status path exactly once.
- RLS currently exposes orders to the owning customer/admin and exposes enabled non-gateway payment methods publicly. Gateway transaction and webhook records must not be public.

## Provider-independent design

Keep checkout provider-neutral. Introduce a server-side adapter contract:

- `createCheckoutSession({ order, idempotencyKey })`
- `verifyWebhook({ headers, rawBody })`
- `queryPayment({ providerReference })`
- `refundPayment({ providerReference, amount, reason })`

Provider adapters (e.g. SSLCOMMERZ, aamarPay, bKash) implement this contract. Never trust a browser return URL as proof of payment.

## Database changes (future migration; not applied)

### `payment_transactions`

- `id uuid primary key`
- `order_id uuid not null references orders(id) on delete restrict`
- `provider_code text not null`
- `merchant_reference text not null unique`
- `provider_transaction_id text`
- `provider_session_id text`
- `amount numeric(20,2) not null check (amount > 0)`
- `currency text not null check (currency = 'BDT')`
- `status text not null` with controlled values: initiated, pending, paid, failed, cancelled, refunded, partially_refunded
- `verified_at timestamptz`
- `provider_response jsonb not null default '{}'` (strictly sanitized; no secrets, card data, or unnecessary PII)
- timestamps; unique provider transaction identity where supplied.

### `payment_webhook_events`

- `id uuid primary key`
- `provider_code text not null`
- `event_key text not null`
- `payload_hash text not null`
- `processing_status text not null` (received, processed, ignored, failed)
- `received_at`, `processed_at`
- `safe_error_code text`
- unique (`provider_code`, `event_key`) for replay/idempotency protection.
- Do not retain raw webhook payload by default; if provider support requires it, redact and limit retention.

### Canonical order status

Keep `orders.payment_status` as the storefront/admin summary. A verified gateway event must atomically:
1. Lock the transaction and order.
2. Confirm provider signature/authenticity and provider-side transaction status.
3. Match merchant reference, order ID, amount and BDT currency exactly.
4. Reject duplicate/replayed events and invalid state transitions.
5. Mark transaction paid and order payment_status verified in one DB transaction.
6. Preserve the existing affiliate conversion logic and audit trail.

A failed/cancelled event must never overwrite a paid transaction. Refunds require a provider-confirmed refund result; an admin note alone must not claim that money was returned.

## Security and operations

- Store merchant secrets only in Vercel server-side environment variables, never in `payment_methods.configuration`, browser code, Git, or database rows.
- Webhook route must read the raw request body where required, verify provider signature/server-side status, rate-limit where possible, and respond idempotently.
- Transaction/webhook tables: no anon/authenticated direct writes; no public reads. Admin read access only through a permission-checked server path. Server writes should use a narrowly scoped server-only service client or hardened SECURITY DEFINER RPCs.
- Keep manual and COD flows unchanged.
- Feature flag the gateway and keep it disabled until merchant approval, sandbox verification, production credentials, callback URL verification, and end-to-end tests are complete.
- Add tests for duplicate checkout, duplicate webhook, mismatched amount/currency, invalid signature, late success after cancellation, success then failure, refund, and affiliate conversion.

## Decisions still required

1. Merchant/provider selection and approved merchant account.
2. Provider's sandbox and production credentials (entered only in Vercel environment settings).
3. Refund and settlement policy, fees, and supported payment methods.
4. Whether the business category is eligible for the selected provider.

No schema migration or live payment setting is changed by this design document.
