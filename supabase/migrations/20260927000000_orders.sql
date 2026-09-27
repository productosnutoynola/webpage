-- Pedidos de la tienda. Solo el servidor (service role) lee y escribe:
-- RLS activo y sin políticas = sin acceso para anon/authenticated.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),

  customer_name text not null,
  customer_legal_id text,
  customer_email text not null,
  customer_phone text not null,

  city text not null,
  region text not null,
  neighborhood text,
  address text not null,
  delivery_notes text,

  lines jsonb not null,
  gross integer not null,
  discount integer not null,
  subtotal integer not null,
  shipping integer not null,
  total integer not null,
  amount_in_cents bigint not null,

  wompi_transaction_id text,
  payment_method text,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_email_idx on public.orders (customer_email);

alter table public.orders enable row level security;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
