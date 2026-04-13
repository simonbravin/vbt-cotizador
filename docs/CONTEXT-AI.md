# Contexto para IA – Plataforma VBT / VBT Platform

Este documento describe el **tech stack**, la **estructura de la aplicación**, el **dominio de negocio** y las **convenciones** del proyecto para que cualquier IA (o desarrollador) entienda de qué se trata la plataforma. La aplicación está en evolución hacia un **CRM** y se prepara para ser **multi-tenant** (cada partner verá solo sus clientes, cotizaciones, presupuestos y ventas; un superadmin verá todo).

---

## 1. ¿Qué es esta plataforma?

- **Nombre de producto:** **Plataforma VBT** (ES) / **VBT Platform** (EN). El repositorio en GitHub es **simonbravin/vbt-platform** y la carpeta local habitual es `vbt-platform`; no usar “Cotizador” como nombre de marca en UI ni emails.
- **Empresa:** Vision Building Technologies (VBT).
- **Propósito:** Herramienta interna para **cotizar** proyectos de construcción (sistemas de muros/prefabricados: S80, S150, S200), calcular costos de fábrica, flete, impuestos y comisiones, enviar cotizaciones por email (PDF), gestionar **ventas** (Sales), facturación y pagos. Incluye **clientes**, **proyectos**, **catálogo de piezas**, **inventario**, **importación desde Revit (CSV)** y **reportes**.
- **Evolución planeada:** Migración hacia un **CRM**; modelo **multi-tenant** donde cada partner (Org) ve solo sus datos y un superadmin ve todo.

---

## 2. Tech stack

| Capa | Tecnología |
|------|------------|
| **Runtime** | Node.js >= 18 |
| **Package manager** | pnpm >= 8 (monorepo con workspaces) |
| **Frontend** | React 18, Next.js 14 (App Router) |
| **UI** | Tailwind CSS, shadcn/ui (Radix), Lucide icons, CVA, clsx, tailwind-merge |
| **Forms** | react-hook-form, @hookform/resolvers, Zod |
| **Auth** | NextAuth v4, JWT strategy, Credentials provider (email/password) |
| **Base de datos** | PostgreSQL (Neon), Prisma ORM |
| **PDF** | @react-pdf/renderer |
| **Email** | Resend |
| **i18n** | Sistema propio en `lib/i18n` (en/es) |
| **Emails (asunto + cuerpo)** | `User.emailLocale` (`en` \| `es`): registro, cambio de idioma en UI (`/api/saas/user/email-locale`), y restablecer contraseña. Asuntos en `lib/email-config.ts`; cuerpos HTML en `lib/email-bodies.ts` (un idioma por correo). Aviso al superadmin por nueva solicitud de cuenta: solo inglés. |
| **Tests** | Vitest (en `@vbt/core`) |

### Variables de entorno (ver `.env.example`)

- `DATABASE_URL` – Postgres (Neon).
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` – NextAuth.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` – Envío de emails.
- `NEXT_PUBLIC_APP_URL` – URL pública de la app.
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` – Usuario creado por seed.

---

## 3. Estructura del monorepo

```
vbt-platform/
├── apps/
│   └── web/                    # Next.js 14 App Router
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # login, signup, pending
│       │   │   ├── (dashboard)/# rutas protegidas: dashboard, projects, clients, quotes, sales, reports, admin/*
│       │   │   ├── api/        # API routes (REST)
│       │   │   ├── layout.tsx, page.tsx, globals.css
│       │   │   └── ...
│       │   ├── components/     # UI (layout, quotes, pdf, providers)
│       │   └── lib/            # auth, db, audit, i18n, utils, email-templates, sales
│       ├── next.config.js
│       └── package.json
├── packages/
│   ├── db/                     # @vbt/db
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Modelo completo
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   └── src/index.ts        # re-export Prisma client
│   └── core/                   # @vbt/core
│       └── src/
│           ├── index.ts
│           ├── calculations.ts # Cálculos de cotización (costos, flete, impuestos)
│           ├── csv-parser.ts   # Parseo CSV Revit
│           ├── normalizer.ts   # Normalización de nombres de piezas
│           ├── quote-engine.ts  # Ensamblado de cotización (snapshot)
│           └── ...
├── docs/
│   ├── ERD-ESTRUCTURA-ACTUAL.md  # ERD actual y notas multi-tenant
│   ├── ASSUMPTIONS.md            # Supuestos de implementación
│   └── CONTEXT-AI.md             # Este archivo
├── package.json
└── .env.example
```

- **apps/web** importa `@vbt/db` y `@vbt/core` (workspace). Next transpila estos paquetes (`transpilePackages` en `next.config.js`).
- El cliente de Prisma se genera en `apps/web/.prisma/client` (configurado en `packages/db/prisma/schema.prisma`).

---

## 4. Autenticación y roles

- **NextAuth** con estrategia **JWT** y **CredentialsProvider**. No hay OAuth en uso.
- **Registro:** Signup crea usuario con estado `PENDING`; un ADMIN/SUPERADMIN debe aprobarlo para que pase a `ACTIVE`.
- **Sesión:** Tras login se guardan en el token/session: `id`, `email`, `name`, `role`, `activeOrgId` (y legacy `orgId`/`orgSlug` deprecados). El usuario pertenece a **una Org** (por ahora se toma la primera membresía en `authorize`). Para obtener la org actual en código usar `getEffectiveOrganizationId(user)`.
- **Roles (`OrgMemberRole`):**  
  - **SUPERADMIN** – Acceso total; solo SUPERADMIN ve “Entities” (BillingEntity); puede cambiar roles de usuarios.  
  - **ADMIN** – Configuración de la org (catálogo, warehouses, países, flete, impuestos, settings, usuarios).  
  - **SALES** – Operación + inventario.  
  - **VIEWER** – Solo lectura (según qué rutas expongan datos).
- **Scoping:** Casi todas las APIs filtran por `organizationId` obtenido de `getEffectiveOrganizationId(session.user)` (que usa `activeOrgId` con fallback a `orgId` legacy). Quien no tiene org activa no debería ver datos de otras orgs; el superadmin de plataforma usa `getVisionLatamOrganizationId` para recursos de VL y puede ver todos los partners.

Referencia: `apps/web/src/lib/auth.ts`, `apps/web/src/app/(dashboard)/layout.tsx`.

---

## 4.1. Vision Latam (plataforma) vs partners (distribuidores)

- **Vision Latam** es la organización dueña de la plataforma (empresa que tiene stock propio y distribuidores). En el modelo de datos existe **una sola organización** con `organizationType: "vision_latam"`. Esa org tiene bodegas, inventario, catálogo que administra la plataforma.
- **Superadmin** es un **rol de usuario** (ej. `user.isPlatformSuperadmin`). No es “un usuario más”: cuando actúa, lo hace en nombre de **Vision Latam** (crear bodegas de VL, inventario de VL, aprobar cotizaciones de partners, config global). El `organizationId` que se usa en esas acciones es **siempre el de la org Vision Latam**, obtenido por `getVisionLatamOrganizationId(prisma)` — no el `activeOrgId` del usuario.
- **Partners** son organizaciones con `organizationType` comercial (distribuidores). Cada partner tiene su propio `organizationId`, sus bodegas, inventario, clientes, cotizaciones. Las APIs de partner usan `ctx.activeOrgId` (la org del usuario en sesión).
- **Bootstrap:** La org Vision Latam debe existir desde el setup. La migración `20250321000000_bootstrap_vision_latam_org` la crea si no existe (idempotente). El seed también la crea/actualiza. **Ninguna API crea esta org sobre la marcha**; si falta, se responde 503 con mensaje claro de ejecutar migraciones/seed.
- **Convención de FKs:** Todas las FKs a organizaciones usan la columna **`organization_id`** en la DB y el campo **`organizationId`** en Prisma; en sesión se usa **`activeOrgId`** (legacy: `orgId` deprecado). Una sola convención en todo el sistema.

Referencia: `packages/core` `getVisionLatamOrganizationId`, `packages/db/prisma/migrations/20250321000000_bootstrap_vision_latam_org`, rutas `api/admin/warehouses` y `api/saas/inventory/vision-latam-org`.

---

## 5. Modelo de datos (resumen)

- **Tenant:** La entidad **Org** es el tenant. Casi todo lo operativo tiene **`organization_id`** (DB) / **`organizationId`** (Prisma): Client, Project, Quote, Sale, Warehouse, CountryProfile, FreightRateProfile, TaxRuleSet, BillingEntity, Payment, AuditLog, RevitImport.
- **Global (sin organization_id):** User, SystemType, PieceCatalog, PieceCost. PieceAlias tiene `organization_id` opcional.
- **Flujos principales:**  
  - **Clientes** → **Proyectos** → **Cotizaciones (Quotes)** (con líneas, impuestos, docs/PDF).  
  - **Quote** puede ser “baseline” de un Project; al cerrar venta, **Sale** liga Client, Project, Quote (opcional), facturas (SaleInvoice por BillingEntity) y **Payments**.
- **Catálogo:** SystemType (S80, S150, S200), PieceCatalog, PieceCost (precios por pieza), PieceAlias (mapeo de nombres/Revit por org o global).
- **Inventario:** Warehouse → InventoryItem (por piece + opcional height) → InventoryMove (IN/OUT/TRANSFER/ADJUST/RESERVE/RELEASE); se puede reservar stock por Quote.
- **Documentación detallada:** Ver `docs/ERD-ESTRUCTURA-ACTUAL.md` (tablas, relaciones, enums, índices, estado multi-tenant).

---

## 6. Rutas de la aplicación (dashboard)

- **Dashboard** – `/dashboard`
- **Proyectos** – `/projects`, `/projects/new`, `/projects/[id]`, `/projects/logs`
- **Clientes** – `/clients`, `/clients/[id]`
- **Cotizaciones** – `/quotes`, `/quotes/new`, `/quotes/[id]`
- **Ventas** – `/sales`, `/sales/new`, `/sales/[id]`, `/sales/[id]/edit`, `/sales/statements`
- **Reportes** – `/reports`
- **Admin:** `/admin/users`, `/admin/entities` (SUPERADMIN), `/admin/catalog`, `/admin/warehouses`, `/admin/countries`, `/admin/freight`, `/admin/taxes`, `/admin/settings`, `/admin/inventory`

La navegación y visibilidad por rol están definidas en `apps/web/src/components/layout/sidebar.tsx`.

---

## 7. API

- **Patrón:** Next.js App Router API routes en `apps/web/src/app/api/`. No hay tRPC.
- **Auth:** Las rutas que requieren sesión usan `getServerSession(authOptions)`; si no hay sesión devuelven 401.
- **Scoping:** Las lecturas/escrituras de datos por org usan `getEffectiveOrganizationId(session.user)` o `ctx.activeOrgId` en el `where` de Prisma (ej. `where: { id, organizationId }`).
- **Roles:** Algunas rutas comprueban `user.role` (ej. SUPERADMIN o ADMIN) y devuelven 403 si no aplica.
- **Validación:** Entradas validadas con Zod; respuestas típicamente JSON.
- **Auditoría:** Acciones sensibles registradas con `createAuditLog` (ver `lib/audit.ts`).

Ejemplos de rutas: `api/projects`, `api/projects/[id]`, `api/quotes`, `api/quotes/[id]`, `api/sales`, `api/clients`, `api/countries`, `api/catalog`, `api/admin/*`, `api/auth/[...nextauth]`.

---

## 8. Lógica de negocio relevante

- **Sistemas de muro:** S80 (80mm), S150 (6in ≈ 150mm), S200 (8in ≈ 200mm). Se usan para áreas (m²), costos por sistema y estimados de acero/concreto.
- **Cotización:** Métodos de costo: CSV (por líneas/import), M2_BY_SYSTEM, M2_TOTAL. Se calcula factory cost, comisión (pct + fija), FOB, flete, CIF, impuestos/fees, landed DDP. El snapshot se guarda en `Quote.snapshot` al enviar.
- **Comisión:** `commission = factoryCost * pct/100 + fixed`. Org tiene defaults; Quote y Sale tienen sus propios valores.
- **Flete:** Por contenedor; total = freightPerContainer × numContainers. Perfil de flete por país (FreightRateProfile).
- **Impuestos:** TaxRuleSet por país; reglas en JSON (TaxBase: CIF, FOB, BASE_IMPONIBLE, etc.). Para Argentina, BASE_IMPONIBLE se arma con CIF + duty + statistic.
- **Inventario:** Reservas por quote; no bloquea cotización si hay déficit (production_needed).
- **CSV/Revit:** Importación CSV con mapeo de columnas y de piezas (PieceCatalog/Alias); líneas pueden quedar mapeadas o ignoradas. Alturas en mm.

Detalle en `docs/ASSUMPTIONS.md` y en `packages/core` (calculations, quote-engine, csv-parser).

---

## 9. Convenciones de código

- **Idioma:** TypeScript en todo el proyecto.
- **DB:** Prisma; nombres de tabla en snake_case (`@@map`); IDs `cuid()`.
- **Estilo UI:** Componentes en `components/ui/` (estilo shadcn); layout en `components/layout/`. Traducciones en `lib/i18n/translations.ts` (keys tipo `nav.dashboard`, `auth.signIn`, etc.).
- **Nombres:** Rutas API bajo `app/api/`; páginas bajo `app/(dashboard)/` o `app/(auth)/`.

---

## 10. Evolución planeada (multi-tenant y CRM)

- **Multi-tenant:** Cada partner = una Org. Cada partner ve solo sus clientes, cotizaciones, presupuestos y ventas. Un **superadmin de plataforma** verá todo (aún por definir: flag en User vs rol en org especial).
- **Precios por partner:** Factory cost + comisión de la plataforma; el partner podrá cargar su propia comisión (ej. limitada al 20%) — para más adelante.
- **CRM:** La plataforma evolucionará hacia un CRM (más foco en pipeline de ventas, clientes, actividades, etc.); el modelo actual de Client, Project, Quote, Sale es la base.

Para cambios en el modelo de datos y estado actual del ERD, usar `docs/ERD-ESTRUCTURA-ACTUAL.md`.

---

## 11. Comandos útiles

- `pnpm install` – Instalar dependencias (raíz).
- `pnpm dev` – Arrancar app web en desarrollo.
- `pnpm build` – Build de la app web.
- `pnpm db:generate` – Generar cliente Prisma.
- `pnpm db:migrate` – Ejecutar migraciones.
- `pnpm db:push` – Push del schema (dev).
- `pnpm db:seed` – Ejecutar seed (crea org, superadmin, etc.).
- `pnpm db:studio` – Abrir Prisma Studio.
- `pnpm test` – Tests (core).

---

## 12. Referencias rápidas

| Documento | Contenido |
|-----------|-----------|
| `docs/ERD-ESTRUCTURA-ACTUAL.md` | ERD actual, tablas, relaciones, enums, estado multi-tenant |
| `docs/ASSUMPTIONS.md` | Supuestos de implementación (PDF, auth, multi-org, reglas de negocio, límites) |
| `packages/db/prisma/schema.prisma` | Fuente de verdad del modelo de datos |
| `apps/web/src/lib/auth.ts` | Configuración NextAuth y tipo de usuario en sesión |
| `apps/web/src/components/layout/sidebar.tsx` | Navegación y permisos por rol |

---

*Este contexto permite a cualquier IA entender qué es la plataforma, cómo está construida y hacia dónde evoluciona (multi-tenant + CRM).*
