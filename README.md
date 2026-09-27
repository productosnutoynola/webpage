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
| `POST /api/checkout` | Recalcula precios **en servidor**, crea el pedido `PENDING` y firma la URL de Wompi |
| `GET /api/wompi/transaction` | Consulta el estado real de una transacción |
| `POST /api/wompi/events` | Webhook de Wompi (checksum verificado); actualiza el pedido |

- Reglas comerciales en `lib/catalog.ts` (precio, envíos, packs): un solo lugar para cambiarlas.
- Los packs entran al carrito como una línea con su descuento (−8 % Dúo, −15 % Trío, −22 % Familiar). La Caja Regalo cobra los $14.000 de la caja. Dúo y Regalo permiten elegir sabores.
- El pedido solo pasa a `APPROVED` si el monto cobrado por Wompi coincide con el del pedido.

## Puesta en producción

1. **Supabase**: aplicar `supabase/migrations/20260927000000_orders.sql` (SQL Editor o `supabase db push`).
2. **Vercel**: importar el repo → Framework Next.js. Variables de entorno (ver `.env.example`):
   `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://productosnutoynola.com`.
3. **Dominio**: Vercel → Project → Settings → Domains → agregar `productosnutoynola.com` y `www.productosnutoynola.com`.
   En el registrador del dominio crear los registros exactos que muestre Vercel (típicamente `A @ → 76.76.21.21` y `CNAME www → cname.vercel-dns.com`).
4. **Wompi** (comercios.wompi.co → Desarrolladores): URL de eventos = `https://productosnutoynola.com/api/wompi/events`.
   Probar primero con llaves `pub_test_…` y luego cambiar a `pub_prod_…`.

## Pendientes de negocio

- Número real de WhatsApp en `lib/contact.ts`.
- Reseñas y cifras nutricionales son de ejemplo (del prototipo).
- Revisar claims de etiqueta: "0 g azúcar" y "vegano" con miel de abejas en los ingredientes.
- Envío nacional ($18.000, gratis desde $150.000) fue un supuesto del prototipo.
