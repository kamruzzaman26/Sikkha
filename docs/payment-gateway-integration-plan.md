# Payment Gateway Integration Plan

Status: SSLCOMMERZ selected. Integration is being prepared for Sandbox first; no production merchant credentials or live gateway are configured.

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

## SSLCOMMERZ implementation notes

- Hosted Checkout V4 uses the Session API, IPN listener, and Order Validation API.
- A browser success callback is informational only. The order becomes verified only after the server validates the transaction with SSLCOMMERZ and matches transaction reference, amount, and BDT currency.
- IPN events are idempotent. Duplicate events cannot create duplicate paid states or affiliate commission rows.
- Sandbox is the default. Live mode requires an explicit server environment setting.
- Merchant credentials belong only in Vercel server-side environment variables: `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, and `SSLCOMMERZ_IS_SANDBOX`. Never store them in Git, public variables, or database configuration.
- Merchant onboarding, contracts, identity verification, and settlement accounts must be handled by an eligible adult guardian or authorized adult business representative.
- Refund initiation/confirmation is not yet automated. Gateway orders must not be marked refunded until SSLCOMMERZ confirms the refund.

## Product-level affiliate referral commission

- Each direct-sale product can use no commission, percentage commission, or fixed commission per unit.
- The order item snapshots the commission rule at order creation. Later product edits do not change earlier orders.
- On verified payment, a separate ledger row is created for each order item and the affiliate who referred the order.
- Percentage commission is calculated on the item's proportional net amount after coupon discount. Fixed commission is per unit and capped at the item's net amount.
- Refunds reverse pending/approved/paid ledger entries. External Rokomari and 10 Minute School affiliate commissions remain partner-reported and are not inferred from this site's orders.

## Remaining prerequisites

1. Apply and verify the reviewed database migration before deploying application code.
2. Configure Sandbox credentials in Vercel server-side environment variables.
3. Complete Sandbox end-to-end tests before any production credentials or live-mode setting are considered.
4. Confirm provider eligibility and refund workflow with the adult merchant representative.

No production deployment or live merchant configuration is authorized by this implementation branch.
