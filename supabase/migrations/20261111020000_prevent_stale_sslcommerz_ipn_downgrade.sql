-- Prevent delayed failure/cancellation IPNs from downgrading a newer checkout attempt.
-- This is a follow-up migration; it is intentionally not applied automatically.

create or replace function public.complete_sslcommerz_payment(
  p_merchant_reference text,
  p_validation_id text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_provider_status text,
  p_payload_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row record;
  payment_order_id uuid;
  event_key_value text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_merchant_reference is null
    or (p_provider_status in ('VALID','VALIDATED') and p_validation_id is null)
    or p_provider_transaction_id is null or p_amount is null
    or p_currency is null or p_provider_status is null
    or p_provider_status not in ('VALID','VALIDATED','FAILED','CANCELLED')
    or p_payload_hash is null
  then
    raise exception 'Invalid provider notification.' using errcode = '23514';
  end if;

  event_key_value := coalesce(p_provider_transaction_id,'') || ':' ||
    coalesce(p_validation_id,'') || ':' || p_provider_status;
  insert into public.payment_webhook_events(
    provider_code,event_key,payload_hash,processing_status
  ) values ('sslcommerz',event_key_value,p_payload_hash,'received')
  on conflict (provider_code,event_key) do nothing;
  if not found then
    return true;
  end if;

  -- Use the same lock order as create_sslcommerz_transaction:
  -- order first, then payment transaction. This closes the race where a retry
  -- could be inserted while an older failure event is checking for newer rows.
  select order_id into payment_order_id
  from public.payment_transactions
  where merchant_reference = p_merchant_reference
    and provider_code = 'sslcommerz';
  if not found then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='transaction_not_found',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  perform 1 from public.orders where id = payment_order_id for update;
  if not found then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='order_not_found',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  select * into payment_row
  from public.payment_transactions
  where merchant_reference = p_merchant_reference
    and provider_code = 'sslcommerz'
  for update;
  if not found then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='transaction_not_found',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if payment_row.amount <> p_amount or payment_row.currency <> p_currency then
    update public.payment_webhook_events
    set processing_status='failed', safe_error_code='amount_currency_mismatch',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if exists (
    select 1 from public.orders
    where id = payment_row.order_id and status = 'cancelled'
  ) then
    update public.payment_webhook_events
    set processing_status='ignored', safe_error_code='order_cancelled',
      processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return false;
  end if;

  if payment_row.status = 'paid' then
    update public.payment_webhook_events
    set processing_status='processed', processed_at=now()
    where provider_code='sslcommerz' and event_key=event_key_value;
    return true;
  end if;

  if p_provider_status in ('VALID','VALIDATED') then
    if payment_row.status in ('failed','cancelled','refunded') then
      update public.payment_webhook_events
      set processing_status='ignored', safe_error_code='invalid_late_success',
        processed_at=now()
      where provider_code='sslcommerz' and event_key=event_key_value;
      return false;
    end if;
    update public.payment_transactions
    set status='paid', validation_id=p_validation_id,
      provider_transaction_id=p_provider_transaction_id,
      verified_at=now(), updated_at=now()
    where id=payment_row.id;
    update public.orders
    set payment_status='verified', payment_reviewed_at=now(),
      status=case when status='pending' then 'confirmed' else status end,
      updated_at=now()
    where id=payment_row.order_id and payment_status='awaiting';
  elsif p_provider_status in ('FAILED','CANCELLED') then
    -- Only a currently pending attempt may transition to failed/cancelled.
    -- A repeated or delayed event for an older attempt must not affect the order.
    update public.payment_transactions
    set status=case when p_provider_status='FAILED' then 'failed' else 'cancelled' end,
      updated_at=now()
    where id=payment_row.id and status in ('initiated','pending');

    if found then
      update public.orders
      set payment_status=case when p_provider_status='FAILED' then 'failed' else 'cancelled' end,
        updated_at=now()
      where id=payment_row.order_id
        and payment_status='awaiting'
        and not exists (
          select 1
          from public.payment_transactions newer
          where newer.order_id=payment_row.order_id
            and newer.id <> payment_row.id
            and (newer.created_at, newer.id) > (payment_row.created_at, payment_row.id)
        );
    end if;
  end if;

  update public.payment_webhook_events
  set processing_status='processed', processed_at=now()
  where provider_code='sslcommerz' and event_key=event_key_value;
  return true;
end;
$$;

revoke all on function public.complete_sslcommerz_payment(text,text,text,numeric,text,text,text)
  from public, anon, authenticated;
grant execute on function public.complete_sslcommerz_payment(text,text,text,numeric,text,text,text)
  to service_role;
