-- Correo de envío: al marcar un pedido como enviado (con transportadora y guía)
-- pg_net llama a la Edge Function order-confirmation-email con kind = 'shipped'.

alter table public.orders
  add column if not exists carrier text,
  add column if not exists shipped_email_sent_at timestamptz,
  add column if not exists shipped_email_error text;

-- Nueva firma con transportadora (la de 3 argumentos queda por compatibilidad;
-- el sitio siempre llama con p_carrier).
create or replace function public.admin_set_order_status(
  p_reference text,
  p_status public.order_status,
  p_tracking text,
  p_carrier text
) returns public.order_status
language plpgsql set search_path = '' as $$
declare v_current public.order_status;
begin
  select status into v_current from public.orders where reference = p_reference for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_status = 'shipped' and v_current in ('paid', 'preparing') then
    update public.orders set status = 'shipped', shipped_at = now(),
      tracking_code = coalesce(nullif(trim(p_tracking), ''), tracking_code),
      carrier = coalesce(nullif(trim(p_carrier), ''), carrier)
    where reference = p_reference;
  elsif p_status = 'delivered' and v_current = 'shipped' then
    update public.orders set status = 'delivered', delivered_at = now() where reference = p_reference;
  else
    raise exception 'INVALID_TRANSITION' using detail = v_current::text || ' -> ' || p_status::text;
  end if;
  return p_status;
end $$;

revoke all on function public.admin_set_order_status(text, public.order_status, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_order_status(text, public.order_status, text, text) to service_role;

create or replace function public._enqueue_order_shipped_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://mmtqemsapypaptcoqilr.supabase.co/functions/v1/order-confirmation-email',
    body := jsonb_build_object('order_id', new.id, 'kind', 'shipped'),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 15000
  );
  return new;
end $$;

revoke all on function public._enqueue_order_shipped_email() from public, anon, authenticated;

create trigger orders_shipped_email
  after update of status on public.orders
  for each row
  when (new.status = 'shipped' and old.status is distinct from 'shipped')
  execute function public._enqueue_order_shipped_email();

-- Reenvío manual del correo de envío desde el panel.
create or replace function public.resend_shipped_email(p_reference text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_req bigint;
begin
  select id into v_id from public.orders where reference = p_reference and status = 'shipped';
  if not found then raise exception 'NOT_SHIPPED'; end if;
  update public.orders set shipped_email_sent_at = null, shipped_email_error = null where id = v_id;
  select net.http_post(
    url := 'https://mmtqemsapypaptcoqilr.supabase.co/functions/v1/order-confirmation-email',
    body := jsonb_build_object('order_id', v_id, 'kind', 'shipped'),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 15000
  ) into v_req;
  return v_req;
end $$;

revoke all on function public.resend_shipped_email(text) from public, anon, authenticated;
grant execute on function public.resend_shipped_email(text) to service_role;
