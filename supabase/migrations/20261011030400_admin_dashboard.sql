-- Panel de administración: métricas y cambio de estado de pedidos.
-- Solo ejecutable por service_role (el servidor del sitio, tras validar la sesión admin).

-- Estados que cuentan como venta (pago aprobado).
create or replace function public._is_sale(s public.order_status)
returns boolean language sql immutable set search_path = '' as $$
  select s in ('paid', 'preparing', 'shipped', 'delivered');
$$;

-- Métricas del período: últimos p_days días (null = todo el histórico), en hora de Bogotá.
create or replace function public.admin_dashboard(p_days integer default 30)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Bogota')::date;
  v_from date;
  v_result jsonb;
begin
  if p_days is null then
    select coalesce(min((paid_at at time zone 'America/Bogota')::date), v_today) into v_from
    from public.orders where public._is_sale(status);
    v_from := greatest(v_from, v_today - 364);
  else
    v_from := v_today - (p_days - 1);
  end if;

  with sales as (
    select o.*, (o.paid_at at time zone 'America/Bogota')::date as day
    from public.orders o
    where public._is_sale(o.status)
      and (o.paid_at at time zone 'America/Bogota')::date between v_from and v_today
  ),
  bags as (
    select c.product_id, sum(c.quantity * i.quantity)::int as qty
    from sales s
    join public.order_items i on i.order_id = s.id
    join public.order_item_components c on c.order_item_id = i.id
    group by c.product_id
  )
  select jsonb_build_object(
    'from', v_from,
    'to', v_today,
    'kpis', (select jsonb_build_object(
        'revenue', coalesce(sum(total_cop), 0),
        'orders', count(*),
        'avg_ticket', coalesce(round(avg(total_cop)), 0),
        'discounts', coalesce(sum(discount_cop), 0),
        'shipping', coalesce(sum(shipping_cop), 0),
        'customers', count(distinct customer_id)
      ) from sales),
    'bags', (select coalesce(sum(qty), 0) from bags),
    'by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day::date, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.orders, 0)) order by d.day), '[]')
               from generate_series(v_from, v_today, interval '1 day') as d(day)
               left join (select day, sum(total_cop) as revenue, count(*) as orders from sales group by day) x on x.day = d.day::date),
    'by_city', (select coalesce(jsonb_agg(jsonb_build_object('city', city, 'region', region, 'revenue', revenue, 'orders', orders) order by revenue desc), '[]')
                from (select ship_city as city, ship_region as region, sum(total_cop) as revenue, count(*) as orders
                      from sales group by ship_city, ship_region) c),
    'by_flavor', (select coalesce(jsonb_agg(jsonb_build_object('slug', p.slug, 'name', p.name, 'bags', coalesce(b.qty, 0)) order by coalesce(b.qty, 0) desc, p.sort_order), '[]')
                  from public.products p left join bags b on b.product_id = p.id),
    'by_item', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'kind', kind, 'units', units, 'revenue', revenue) order by revenue desc), '[]')
                from (select i.name, i.kind, sum(i.quantity)::int as units, sum(i.line_total_cop)::int as revenue
                      from sales s join public.order_items i on i.order_id = s.id
                      group by i.name, i.kind) it),
    -- Operación: estado actual de todos los pedidos (no depende del período).
    'status', (select coalesce(jsonb_object_agg(status, n), '{}')
               from (select status, count(*) as n from public.orders group by status) st),
    'inventory', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'on_hand', on_hand, 'reserved', reserved,
                                                               'available', available, 'low', low_stock)), '[]')
                  from public.inventory_status)
  ) into v_result;

  return v_result;
end $$;

-- Avance del pedido por el admin: paid/preparing → shipped → delivered.
create or replace function public.admin_set_order_status(
  p_reference text,
  p_status public.order_status,
  p_tracking text default null
) returns public.order_status
language plpgsql set search_path = '' as $$
declare v_current public.order_status;
begin
  select status into v_current from public.orders where reference = p_reference for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_status = 'shipped' and v_current in ('paid', 'preparing') then
    update public.orders set status = 'shipped', shipped_at = now(),
      tracking_code = coalesce(nullif(trim(p_tracking), ''), tracking_code)
    where reference = p_reference;
  elsif p_status = 'delivered' and v_current = 'shipped' then
    update public.orders set status = 'delivered', delivered_at = now() where reference = p_reference;
  else
    raise exception 'INVALID_TRANSITION' using detail = v_current::text || ' -> ' || p_status::text;
  end if;
  return p_status;
end $$;

revoke all on function public._is_sale(public.order_status), public.admin_dashboard(integer),
  public.admin_set_order_status(text, public.order_status, text) from public, anon, authenticated;
grant execute on function public._is_sale(public.order_status), public.admin_dashboard(integer),
  public.admin_set_order_status(text, public.order_status, text) to service_role;
