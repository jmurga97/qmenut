# Panel de administración y facturación (MVP1)

Panel SPA (`apps/admin`) para que el dueño de un restaurante gestione su carta,
sucursal, promociones, tema y suscripción. Autenticación por email OTP (Better
Auth) y autorización multi-tenant en la API. Facturación SaaS por sucursal con
Stripe (Checkout + Customer Portal).

## Arquitectura

- **apps/admin** — SPA React (Vite, TanStack Router file-based, TanStack Query,
  `@murga.ing/components`). Habla con la API por tRPC (`/trpc`) con cookies de
  sesión (`credentials: "include"`). Puerto dev **5174**.
- **apps/api** — Worker tRPC. Procedimientos admin bajo el namespace `admin.*`,
  todos sobre `tenantProcedure` (carga la pertenencia del usuario en
  `restaurant_users` y expone `ctx.tenant.restaurantId`). Cada mutación con
  `branchId` pasa por `assertBranchAccess` (NOT_FOUND si la sucursal no es del
  tenant) y `requireRole` para escrituras (owner/admin; billing solo owner).
- **Lógica de negocio** en `apps/api/src/modules/<dominio>/` (una función por
  caso de uso). Suministradores de infraestructura como clases singleton en
  `apps/api/src/lib/` (`StripeProvider`, `PlanCatalog`, `ThemeWorkerClient`).
- **Repositorios** en `packages/db/src/repositories/` (estilo input-objeto, todo
  filtrado por `restaurantId`).
- **Tema** — la API escribe el KV `TENANT_THEME` a través del worker
  `tenant-config` (único escritor + normalización) por service binding
  `THEME_WORKER`, con `Authorization: Bearer THEME_WORKER_TOKEN`.

## Identidad de usuarios

- Better Auth sustituye a Clerk. `restaurant_users.user_id` referencia
  `users(id)` (migración `0004_auth_user_linking.sql`). Se eliminó
  `restaurants.clerk_org_id`.
- El registro está deshabilitado (`disableSignUp: true`): el login OTP solo
  funciona con usuarios ya existentes. En MVP1 los restaurantes y sus dueños se
  crean manualmente / por seed. El seed incluye a `juanmurga97@gmail.com` como
  `owner` de `rest_tapas`.

## Desarrollo local

```bash
bun install

# 1. Migraciones + seed de la base local (D1)
bun run --cwd apps/api db:migrate:local
bun run --cwd apps/api db:seed:local

# 2. Seed del KV de temas (opcional, para la carta pública)
bun run --cwd apps/tenant-config seed:local

# 3. Levantar los workers y la SPA (cada uno en su terminal)
bun run --cwd apps/tenant-config dev   # :8788  (necesario para el tema)
bun run --cwd apps/api dev             # :8787
bun run --cwd apps/admin dev           # :5174
bun run --cwd apps/web dev             # :5173  (carta pública)
```

`apps/api` y `apps/tenant-config` deben correr a la vez: el service binding
`THEME_WORKER` se resuelve por el registro local de `wrangler dev`.

Copia `apps/api/.dev.vars.example` a `apps/api/.dev.vars` y rellena los secretos.

Login: abre `http://localhost:5174`, introduce el email del seed y el OTP que
llega al email worker (en dev, si no hay entrega real, el código queda en la
tabla `verifications`).

## Stripe (facturación por sucursal)

Planes: `basic` y `business`, pago mensual por sucursal. Checkout alojado +
Customer Portal (sin PCI en nuestro lado). Stripe Connect / delivery es MVP2.

### Configuración de test

1. En el dashboard de Stripe (modo test) crea dos productos con precio mensual
   recurrente y copia sus `price_...`.
2. En `apps/api/wrangler.toml` `[vars]` pon `STRIPE_PRICE_BASIC` y
   `STRIPE_PRICE_BUSINESS`. En `.dev.vars` pon `STRIPE_SECRET_KEY` (`sk_test_...`).
3. Reenvía webhooks al worker y copia el `whsec_...` a `.dev.vars`:
   ```bash
   stripe listen --forward-to http://localhost:8787/webhooks/stripe
   ```
4. En el panel, pulsa «Suscribir», paga con la tarjeta de test `4242 4242 4242
4242`. Prueba casos límite:
   ```bash
   stripe trigger customer.subscription.updated
   stripe trigger invoice.payment_failed
   ```

### Flujo

- `admin.billing.checkout` → crea/recupera el customer del restaurante
  (`stripe_customers`), crea la Checkout Session en modo `subscription` con
  `subscription_data.metadata = { restaurantId, branchId, planCode }` y devuelve
  la URL; la SPA redirige.
- Webhook `/webhooks/stripe` (ruta raw, fuera de tRPC: la verificación de firma
  necesita el cuerpo sin parsear). Eventos manejados:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`. Todos convergen en
  `syncSubscriptionState` (upsert puro por `branch_id` ⇒ idempotente y a prueba
  de reintentos/desorden). Los metadatos identifican tenant/sucursal sin lookup.
- `admin.billing.portal` → Customer Portal para gestionar/cancelar.
- Los estados de Stripe se mapean sobre el enum de 4 valores de
  `branch_subscriptions` (`map-stripe-status.ts`).

## Despliegue

1. **Secretos** (`wrangler secret put` en `apps/api`): `BETTER_AUTH_SECRET`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `THEME_WORKER_TOKEN`.
2. **Rotar** el `ADMIN_TOKEN` de `apps/tenant-config` (hoy es un `dev-token` en
   texto plano en `wrangler.toml`) a un secreto real, y que coincida con
   `THEME_WORKER_TOKEN` de la API.
3. **Vars de producción** en `apps/api/wrangler.toml`: `ADMIN_APP_URL` (dominio
   real del panel), `ALLOWED_ORIGINS` (añade el origen del panel),
   `STRIPE_PRICE_*` de producción.
4. **Webhook de Stripe**: en el dashboard, endpoint
   `https://<api-host>/webhooks/stripe` suscrito a los 4 eventos de arriba.
5. **Desplegar** `qmenut-admin` (assets estáticos: `vite build` → `dist`,
   `wrangler deploy`). Define `VITE_API_BASE_URL` con la URL de la API en el
   build.

### Cookies cross-origin

En dev (localhost) las cookies se comparten entre puertos. En producción, panel
y API deben compartir dominio registrable (p. ej. `admin.qmenut.com` ↔
`api.qmenut.com`) para las cookies same-site por defecto de Better Auth. Si
alguno queda en `*.workers.dev` (está en la Public Suffix List), pasa
`cookieMode: "cross-site"` a `createAuth` (ya soportado por `@qmenut/auth`).
