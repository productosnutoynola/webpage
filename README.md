# Nuto & Nola · productosnutoynola.com

E-commerce de granola en Next.js 15 (App Router) + TypeScript + Tailwind v4.
Pagos con **Wompi** (Web Checkout) y pedidos en **Supabase**. Deploy en **Vercel**.

El diseño original (Claude Design) está en `project/` y los chats en `chats/`.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar llaves de prueba
npm run dev                  # http://localhost:3000
npm test                     # reglas de precios y firma Wompi
npm run build
```

## Arquitectura

| Ruta | Qué hace |
|---|---|
| `/` | Home de una sola página: hero, tienda + combos, cómo se come, nosotros, reseñas, contacto |
| `/producto/[sabor]` | Detalle (estático) de cada sabor |
| `/checkout` | Paso 1: datos de envío. Paso 2: redirección a Wompi |
| `/pedido?id=…` | Wompi redirige aquí; el estado se verifica contra la API de Wompi |
| `POST /api/checkout` | Llama `create_order` en Supabase (precios, envío y stock los decide la base) y firma la URL de Wompi |
| `GET /api/wompi/transaction` | Consulta el estado real de una transacción |
| `POST /api/wompi/events` | Webhook de Wompi (checksum verificado, se registra en `payment_events`); llama `apply_payment` |

- Reglas comerciales en `lib/catalog.ts` (precio, envíos, packs): un solo lugar para cambiarlas.
- Los packs entran al carrito como una línea con su descuento (−8 % Dúo, −15 % Trío, −22 % Familiar). La Caja Regalo cobra los $14.000 de la caja. Dúo y Regalo permiten elegir sabores.
- El pedido solo pasa a `paid` si el monto cobrado por Wompi coincide con el del pedido.

## Backend (Supabase)

Migraciones en `supabase/migrations/` (aplicar en orden). Todas las tablas tienen RLS; el catálogo es de lectura pública y todo lo demás solo lo toca el servidor con la service role key.

| Tabla | Contenido |
|---|---|
| `products` | Sabores: slug, SKU, precio, textos, imagen |
| `bundles`, `bundle_items` | Combos/packs: descuento, cargo extra (caja), composición si es fija |
| `inventory` | Stock por producto: `on_hand` (físico) y `reserved` (en checkout) |
| `inventory_movements` | Kardex: reabastecimientos, reservas, liberaciones, ventas, ajustes |
| `customers`, `addresses` | Clientes (únicos por correo) y sus direcciones |
| `orders`, `order_items`, `order_item_components` | Pedidos con dirección y totales congelados; ítems y bolsas físicas por ítem |
| `payments` | Transacciones de Wompi por pedido |
| `payment_events` | Bitácora de webhooks recibidos |
| `shipping_zones` | Tarifas: Bogotá y resto del país |

**Ciclo del pedido:** `pending_payment` (stock reservado 60 min) → `paid` (stock descontado) → `preparing` → `shipped` → `delivered`. Rechazo → `payment_failed`; reserva vencida → `cancelled`; monto distinto o sin stock al aprobar → `needs_review`.

**Operación diaria (SQL Editor de Supabase):**

```sql
select public.restock('cinnamon-roll', 50, 'Horneada 12 oct');   -- entrada de producto
select public.adjust_stock('cacao-crunch', -2, 'Bolsas dañadas'); -- ajuste
select * from public.inventory_status;                            -- stock disponible
select * from public.orders_overview where status = 'paid';       -- pedidos por despachar
select * from public.sales_daily;                                 -- ventas por día
update public.orders set status = 'shipped', shipped_at = now(), tracking_code = '...' where reference = '4827150936';
```

**Correo de confirmación:** al pasar un pedido a `paid`, el trigger `orders_confirmation_email` (pg_net) llama a la Edge Function `order-confirmation-email` (`supabase/functions/`), que relee el pedido y envía el resumen con su número de pedido (`orders.reference`, el *order ID* que ve el cliente) vía Resend. El resultado queda en `orders.confirmation_email_sent_at` / `confirmation_email_error`. Secretos en Supabase → Edge Functions → Secrets: `RESEND_API_KEY` (obligatorio), `EMAIL_FROM` (remitente; hoy `compras@productosnutoynola.com`, se muestra como "Nuto & Nola") y `ORDER_NOTIFY_EMAIL` (opcional, copia para la tienda). Reenviar: `select public.resend_order_confirmation('4827150936');`

**Catálogo:** productos, packs y envíos viven en Supabase (`products`, `bundles`, `bundle_items`, `shipping_zones`) y se editan en `/admin/tienda`. La tienda los lee con `lib/store.ts` (caché de 5 min que se invalida al guardar en el panel); `lib/catalog.ts` solo tiene tipos y valores de respaldo. Las fotos subidas van al bucket público `productos` de Supabase Storage.

**Pruebas de la base:** `psql "$DATABASE_URL" -f supabase/tests/checkout_flow.sql` (corre en una transacción y la revierte; 25 escenarios).

## Panel de administración (`/admin`)

`www.productosnutoynola.com/admin` → login → `/admin/panel`: ventas del período (7/30/90 días/todo), pedidos, ticket promedio, bolsas y clientes; ingresos diarios; producto más vendido (bolsas por sabor, incluye las de los packs); ventas por ciudad y por producto/pack; inventario; y seguimiento de pedidos con dirección, cliente, artículos, pago y botones **Marcar enviado** (con guía opcional) → **Marcar entregado**.

- Datos: RPC `admin_dashboard(p_days)` y `admin_set_order_status(reference, status, tracking)` (solo `service_role`; migración `admin_dashboard`). Transiciones válidas: `paid/preparing → shipped → delivered`.
- Acceso: variables en Vercel `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET` (*Sensitive*). La clave nunca se guarda en texto plano: para cambiarla, `npm run admin:hash -- 'nueva-clave'`, reemplaza las dos últimas variables y haz *Redeploy*. Sesión de 12 h en cookie HttpOnly firmada.

### Configuración de la tienda (`/admin/tienda`)

Barra lateral → **Configuración de la tienda**:
- **Productos / Agregar producto:** asistente de 5 pasos (básico, fotos, descripción, etiqueta y estilo, stock y publicar) con vista previa en vivo de la tarjeta y la página. Los productos se ocultan, no se borran (los pedidos históricos los referencian).
- **Combos y packs:** bolsas, descuento, cargo adicional, sabores fijos o a elección, apariencia y botón de portada.
- **Envíos por ciudad:** tarifa de Bogotá, del resto del país y tarifas propias por ciudad (`shipping_zones.city`; `create_order` usa `_shipping_zone_for`).
- **Inventario:** sumar bolsas (`restock`), corregir conteo (`set_stock`), alerta de stock bajo y movimientos recientes.
- **Clientes:** búsqueda, compras y total por cliente (`admin_customers`) y descarga en CSV.

## Puesta en producción

1. **Supabase** — proyecto oficial `mmtqemsapypaptcoqilr` ("Productos Nuto & Nola - Sao Paulo", región `sa-east-1`). Migraciones aplicadas y stock inicial cargado (50 bolsas por sabor). El proyecto anterior `teqicnlvqhkpksfyorae` (Canadá) queda en desuso.
2. **Vercel** (proyecto `webpage`, equipo *Productos Nuto Y Nola*): conectado a GitHub (`main` despliega solo), framework Next.js, funciones en `gru1` (São Paulo, junto a Supabase; fijado en `vercel.json`). Ya cargadas: `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`. **Faltan (secretas):** `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` → Settings → Environment Variables → tipo *Sensitive*, luego *Redeploy*.
3. **Dominio**: `productosnutoynola.com` redirige (308) a `www.productosnutoynola.com`; ambos verificados en Vercel y con HTTPS.
4. **Wompi** (comercios.wompi.co → Desarrolladores): URL de eventos = `https://www.productosnutoynola.com/api/wompi/events`.
   Probar primero con llaves `pub_test_…` y luego cambiar a `pub_prod_…`.

## Pendientes de negocio

- Número real de WhatsApp en `lib/contact.ts`.
- Reseñas y cifras nutricionales son de ejemplo (del prototipo).
- Envío nacional ($18.000, gratis desde $150.000) fue un supuesto del prototipo.
