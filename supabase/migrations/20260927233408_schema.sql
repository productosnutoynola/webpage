-- =====================================================================
-- Nuto & Nola · esquema e-commerce
-- Catálogo (products, bundles), inventario con reservas, clientes,
-- pedidos, pagos Wompi y bitácora de webhooks.
-- =====================================================================

create type public.order_status as enum (
  'pending_payment', -- creado, stock reservado, esperando a Wompi
  'paid',            -- pago aprobado, stock descontado
  'preparing',
  'shipped',
  'delivered',
  'payment_failed',  -- pago rechazado; reserva liberada
  'cancelled',       -- reserva expirada o cancelado a mano
  'needs_review'     -- inconsistencia (monto distinto, sin stock al aprobar)
);

create type public.payment_status as enum ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');

create type public.inventory_reason as enum ('restock', 'adjustment', 'reservation', 'release', 'sale', 'return');

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- catálogo
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sku text not null unique,
  name text not null,
  short_description text,
  description text,
  ingredients text,
  price_cop integer not null check (price_cop > 0),
  image_url text,
  color_hex text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Combos y packs. Si flavors_fixed = false el cliente elige bag_count sabores.
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  bag_count integer not null check (bag_count > 0),
  discount_rate numeric(5, 4) not null default 0 check (discount_rate >= 0 and discount_rate < 1),
  extra_fee_cop integer not null default 0 check (extra_fee_cop >= 0),
  flavors_fixed boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Composición de los bundles de sabores fijos.
create table public.bundle_items (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (bundle_id, product_id)
);

create table public.shipping_zones (
  code text primary key,
  name text not null,
  fee_cop integer not null check (fee_cop >= 0),
  free_from_cop integer not null check (free_from_cop >= 0),
  eta_days integer not null default 2,
  active boolean not null default true
);

-- ---------------------------------------------------------------- inventario
create table public.inventory (
  product_id uuid primary key references public.products (id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  check (reserved <= on_hand)
);

-- ---------------------------------------------------------------- clientes
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  full_name text not null,
  phone text,
  legal_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  city text not null,
  region text not null,
  neighborhood text,
  address_line text not null,
  delivery_notes text,
  created_at timestamptz not null default now()
);
create index addresses_customer_idx on public.addresses (customer_id);

-- ---------------------------------------------------------------- pedidos
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references public.customers (id) on delete restrict,
  address_id uuid references public.addresses (id) on delete set null,
  status public.order_status not null default 'pending_payment',

  -- Copia de la dirección al momento de la compra (no cambia si el cliente la edita).
  ship_name text not null,
  ship_phone text not null,
  ship_city text not null,
  ship_region text not null,
  ship_neighborhood text,
  ship_address text not null,
  ship_notes text,
  shipping_zone text not null references public.shipping_zones (code),

  gross_cop integer not null default 0 check (gross_cop >= 0),
  discount_cop integer not null default 0 check (discount_cop >= 0),
  subtotal_cop integer not null default 0 check (subtotal_cop >= 0),
  shipping_cop integer not null default 0 check (shipping_cop >= 0),
  total_cop integer not null default 0 check (total_cop >= 0),
  amount_in_cents bigint generated always as (total_cop::bigint * 100) stored,
  currency text not null default 'COP',

  reserved_until timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  tracking_code text,
  admin_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_customer_idx on public.orders (customer_id);
create index orders_pending_expiry_idx on public.orders (reserved_until) where status = 'pending_payment';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (kind in ('product', 'bundle')),
  product_id uuid references public.products (id) on delete restrict,
  bundle_id uuid references public.bundles (id) on delete restrict,
  name text not null,
  flavors text[] not null default '{}',
  unit_full_price_cop integer not null check (unit_full_price_cop >= 0),
  unit_price_cop integer not null check (unit_price_cop >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cop integer generated always as (unit_price_cop * quantity) stored,
  check ((kind = 'product' and product_id is not null) or (kind = 'bundle' and bundle_id is not null))
);
create index order_items_order_idx on public.order_items (order_id);

-- Bolsas físicas por unidad del ítem. Base para mover inventario.
create table public.order_item_components (
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (order_item_id, product_id)
);

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  reason public.inventory_reason not null,
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  order_id uuid references public.orders (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- ---------------------------------------------------------------- pagos
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'wompi',
  provider_tx_id text not null,
  status public.payment_status not null,
  amount_in_cents bigint not null,
  payment_method text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_tx_id)
);
create index payments_order_idx on public.payments (order_id);

-- Bitácora de webhooks (auditoría y depuración).
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider text not null default 'wompi',
  event_type text not null,
  provider_tx_id text,
  reference text,
  checksum_valid boolean not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- triggers
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger bundles_updated_at before update on public.bundles for each row execute function public.set_updated_at();
create trigger inventory_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS
-- Todo con RLS. El catálogo es de lectura pública; el resto solo lo toca el
-- servidor con la service role key (que omite RLS).
alter table public.products enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_components enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

create policy "catalogo publico" on public.products for select to anon, authenticated using (active);
create policy "catalogo publico" on public.bundles for select to anon, authenticated using (active);
create policy "catalogo publico" on public.bundle_items for select to anon, authenticated using (true);
create policy "catalogo publico" on public.shipping_zones for select to anon, authenticated using (active);
