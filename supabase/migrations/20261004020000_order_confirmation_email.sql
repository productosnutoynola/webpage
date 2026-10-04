-- Correo de confirmación al pagar.
-- Cuando un pedido pasa a 'paid', pg_net llama (de forma asíncrona y solo si la
-- transacción confirma) a la Edge Function order-confirmation-email, que lee el
-- pedido y envía el resumen al cliente. El resultado queda en la misma fila.
create extension if not exists pg_net with schema extensions;

alter table public.orders
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_error text;

create or replace function public._enqueue_order_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://mmtqemsapypaptcoqilr.supabase.co/functions/v1/order-confirmation-email',
    body := jsonb_build_object('order_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 15000
  );
  return new;
end $$;

revoke all on function public._enqueue_order_confirmation_email() from public, anon, authenticated;

drop trigger if exists orders_confirmation_email on public.orders;
create trigger orders_confirmation_email
  after update of status on public.orders
  for each row
  when (new.status = 'paid' and old.status is distinct from 'paid')
  execute function public._enqueue_order_confirmation_email();

-- Reenvío manual (p. ej. tras configurar RESEND_API_KEY):
--   select public.resend_order_confirmation('4827150936');
create or replace function public.resend_order_confirmation(p_reference text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid; v_req bigint;
begin
  select id into v_id from public.orders where reference = p_reference and status = 'paid';
  if not found then raise exception 'Pedido % no existe o no está pagado', p_reference; end if;
  update public.orders set confirmation_email_sent_at = null, confirmation_email_error = null where id = v_id;
  select net.http_post(
    url := 'https://mmtqemsapypaptcoqilr.supabase.co/functions/v1/order-confirmation-email',
    body := jsonb_build_object('order_id', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 15000
  ) into v_req;
  return v_req;
end $$;

revoke all on function public.resend_order_confirmation(text) from public, anon, authenticated;
grant execute on function public.resend_order_confirmation(text) to service_role;
