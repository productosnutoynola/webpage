-- Prueba de extremo a extremo de la lógica de pedidos. Corre en una BD
-- desechable con las migraciones aplicadas:  psql -f supabase/tests/checkout_flow.sql
-- Todo va dentro de una transacción que se revierte al final.
begin;

create or replace function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FALLÓ: %', msg; end if;
  raise notice 'ok  %', msg;
end $$;

create or replace function pg_temp.avail(p_slug text) returns integer language sql as $$
  select i.on_hand - i.reserved from public.inventory i join public.products p on p.id = i.product_id where p.slug = p_slug;
$$;

select public.restock('cinnamon-roll', 5, 'test'), public.restock('cacao-crunch', 5, 'test'), public.restock('frutos-rojos', 5, 'test');

-- 1. Pedido mixto: Trío + Dúo (cacao, frutos) + 2 Cinnamon, Bogotá.
create temp table r1 as select public.create_order(
  '{"email":"Maria@Correo.com","name":"María Rodríguez","phone":"3001234567"}',
  '{"city":"Bogotá","region":"Bogotá D.C.","address":"Cra 7 # 45-32"}',
  '[{"kind":"pack","pack":"trio","flavors":["cacao-crunch"],"qty":1},
    {"kind":"pack","pack":"duo","flavors":["cacao-crunch","frutos-rojos"],"qty":1},
    {"kind":"flavor","flavor":"cinnamon-roll","qty":2}]') as j;
select pg_temp.check((select (j->'totals'->>'total')::int from r1) = 236430, 'total pedido mixto = 236.430 (trío fijo aunque el cliente mande otros sabores)');
select pg_temp.check((select (j->'totals'->>'discount')::int from r1) = 22570, 'descuento packs = 22.570');
select pg_temp.check((select (j->'totals'->>'shipping')::int from r1) = 0, 'envío gratis Bogotá > 100.000');
select pg_temp.check(pg_temp.avail('cinnamon-roll') = 2 and pg_temp.avail('cacao-crunch') = 3 and pg_temp.avail('frutos-rojos') = 3, 'stock reservado (3/2/2)');
select pg_temp.check((select email from public.customers) = 'maria@correo.com', 'cliente guardado con correo normalizado');

-- 2. Pago aprobado + idempotencia.
select pg_temp.check(public.apply_payment((select j->>'reference' from r1), 'tx-1', 'APPROVED', 23643000, 'CARD') = 'paid', 'pago aprobado → paid');
select pg_temp.check(public.apply_payment((select j->>'reference' from r1), 'tx-1', 'APPROVED', 23643000, 'CARD') = 'paid', 'webhook repetido es idempotente');
select pg_temp.check((select on_hand from public.inventory_status where slug = 'cinnamon-roll') = 2 and (select sum(reserved) from public.inventory) = 0, 'stock descontado una sola vez');

-- 3. Sin stock.
do $$ begin
  perform public.create_order('{"email":"a@b.co","name":"Ana","phone":"300"}', '{"city":"Bogotá","region":"Bogotá D.C.","address":"x"}',
    '[{"kind":"flavor","flavor":"cinnamon-roll","qty":3}]');
  raise exception 'FALLÓ: debió agotarse';
exception when others then
  if sqlerrm <> 'OUT_OF_STOCK' then raise; end if;
  raise notice 'ok  sin stock → OUT_OF_STOCK';
end $$;
select pg_temp.check(pg_temp.avail('cinnamon-roll') = 2, 'pedido fallido no deja reservas ni pedido');

-- 4. Rechazado → libera reserva. Caja Regalo, ciudad nacional.
create temp table r2 as select public.create_order('{"email":"b@b.co","name":"Beto","phone":"300"}',
  '{"city":"Chía","region":"Cundinamarca","address":"Calle 1"}',
  '[{"kind":"pack","pack":"regalo","flavors":["frutos-rojos","frutos-rojos"],"qty":1}]') as j;
select pg_temp.check((select (j->'totals'->>'subtotal')::int from r2) = 82080, 'Caja Regalo cobra la caja: 82.080');
select pg_temp.check((select (j->'totals'->>'shipping')::int from r2) = 18000, 'envío nacional 18.000 bajo 150.000');
select pg_temp.check(pg_temp.avail('frutos-rojos') = 1, 'reserva de 2 Frutos Rojos');
select pg_temp.check(public.apply_payment((select j->>'reference' from r2), 'tx-2', 'DECLINED', 10008000) = 'payment_failed', 'rechazado → payment_failed');
select pg_temp.check(pg_temp.avail('frutos-rojos') = 3, 'reserva liberada');

-- 5. Reserva vencida y pago aprobado tardío (PSE lento).
create temp table r3 as select public.create_order('{"email":"c@b.co","name":"Caro","phone":"300"}',
  '{"city":"Bogotá","region":"Bogotá D.C.","address":"x"}', '[{"kind":"flavor","flavor":"cacao-crunch","qty":1}]') as j;
update public.orders set reserved_until = now() - interval '1 minute' where reference = (select j->>'reference' from r3);
select pg_temp.check(public.release_expired_reservations() = 1, 'reserva vencida se cancela');
select pg_temp.check(pg_temp.avail('cacao-crunch') = 3, 'stock devuelto al cancelar');
select pg_temp.check(public.apply_payment((select j->>'reference' from r3), 'tx-3', 'APPROVED', 4900000, 'PSE') = 'paid', 'aprobado tardío con stock → paid');
select pg_temp.check((select on_hand from public.inventory_status where slug = 'cacao-crunch') = 2, 'venta tardía descuenta del físico');

-- 6. Monto distinto → revisión.
create temp table r4 as select public.create_order('{"email":"d@b.co","name":"Dani","phone":"300"}',
  '{"city":"Bogotá","region":"Bogotá D.C.","address":"x"}', '[{"kind":"flavor","flavor":"frutos-rojos","qty":1}]') as j;
select pg_temp.check(public.apply_payment((select j->>'reference' from r4), 'tx-4', 'APPROVED', 100) = 'needs_review', 'monto distinto → needs_review');
select pg_temp.check(pg_temp.avail('frutos-rojos') = 3, 'reserva liberada en revisión');

-- 7. Validaciones de entrada.
do $$ begin
  perform public.create_order('{"email":"e@b.co","name":"E","phone":"300"}', '{"city":"Bogotá","region":"Bogotá D.C.","address":"x"}',
    '[{"kind":"pack","pack":"duo","flavors":["cacao-crunch"],"qty":1}]');
  raise exception 'FALLÓ';
exception when others then
  if sqlerrm <> 'INVALID_FLAVORS' then raise; end if;
  raise notice 'ok  Dúo con 1 sabor → INVALID_FLAVORS';
end $$;

-- 8. Permisos.
set local role anon;
do $$ begin
  perform public.create_order('{}', '{}', '[]');
  raise exception 'FALLÓ: anon ejecutó create_order';
exception when insufficient_privilege then raise notice 'ok  anon no puede crear pedidos';
end $$;
select pg_temp.check((select count(*) from public.products) = 3, 'anon lee el catálogo');
select pg_temp.check((select count(*) from public.orders) = 0, 'anon no ve pedidos (RLS)');
reset role;

select * from public.orders_overview;
rollback;
