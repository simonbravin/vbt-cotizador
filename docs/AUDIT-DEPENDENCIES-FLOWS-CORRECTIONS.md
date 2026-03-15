# Auditoría: dependencias, funcionalidades, debug y pasos de corrección

Revisión exhaustiva según el funcionamiento esperado de la plataforma (superadmin vs partners, comisión por partner, trazabilidad de cotizaciones).

---

## 1. Dependencias

### 1.1 Estado actual

| Paquete | Dependencia | Versión | Nota |
|---------|-------------|---------|------|
| root | next, typescript | ^14.2.5, ^5.3.3 | OK |
| web | @vbt/db, @vbt/core | workspace:* | OK |
| web | next-auth | ^4.24.7 | OK |
| web | zod | ^3.23.8 | Diferente a core |
| web | react, react-dom | ^18.3.1 | OK |
| db | @prisma/client, prisma | ^5.10.2 | En lockfile puede resolverse a 5.22; generar client con `pnpm exec prisma generate` en packages/db tras cambios de schema |
| core | @vbt/db, zod | workspace:*, ^3.22.4 | Zod en core 3.22.4 vs web 3.23.8: compatible, pero se puede alinear a 3.23.x en core para evitar sorpresas |

### 1.2 Recomendación

- **Opcional:** Unificar `zod` en `packages/core` a `^3.23.8` (misma minor que web) y ejecutar tests.
- Tras cualquier cambio en `schema.prisma`, ejecutar `pnpm run db:generate` (o `pnpm exec prisma generate` en `packages/db`) antes de build.

---

## 2. Base de datos (Neon) y migraciones

### 2.1 Error típico en producción

Si en logs aparece:

- `The column projects.organization_id does not exist`
- `The column projects.client_id does not`
- `The column clients.organization_id does not`

significa que **en esa base Neon no se han aplicado las migraciones de normalización** (Prisma usa `@map("organization_id")` y espera columnas en snake_case).

### 2.2 Migraciones que deben estar aplicadas en Neon

Asegurar que en la base que usa la app (p. ej. la de Vercel) estén aplicadas:

1. `20250323000000_projects_normalize_columns` – renombra en `projects`: `organizationId` → `organization_id`, `clientId` → `client_id`
2. `20250324000000_clients_normalize_organization_id` – renombra en `clients`: `organizationId` → `organization_id` (si existía)
3. `20250325000000_partner_commission_and_quote_review` – columnas en `partner_profiles` y `quotes` (comisión por partner, comentario y revisión)

**Paso obligatorio:** En el proyecto, con `DATABASE_URL` apuntando a la base de producción, ejecutar:

```bash
cd packages/db && pnpm run migrate:deploy
```

Comprobar que no queden migraciones pendientes. Si la base se creó con un `db push` antiguo (camelCase), estas migraciones son idempotentes y corrigen el esquema.

---

## 3. Flujos críticos y posibles fallos

### 3.1 Auth y tenant

- **Session:** `getServerSession(authOptions)`; `isPlatformSuperadmin` y `activeOrgId` vienen del callback de sesión.
- **Superadmin:** Si `isPlatformSuperadmin === true`, el layout del dashboard redirige a `/superadmin/dashboard`; no se usa el layout de partners.
- **Partner sin org:** Si no hay `activeOrgId` (ni cookie `vbt-active-org` para superadmin), el layout del dashboard redirige a `/pending`.
- **Cookie `vbt-active-org`:** Solo aplica para superadmin; usada por `getTenantContext()` y `getEffectiveActiveOrgId()` para “ver como” una org.

Sin cambios necesarios si la sesión y la cookie se rellenan bien.

### 3.2 Creación de cotización (POST /api/saas/quotes)

- Se resuelve `orgId` = `tenantCtx.organizationId` o, si falta, `project.organizationId` del proyecto de la cotización.
- Se calcula `visionLatamMarkupPct` con `getVisionLatamCommissionPctForOrg(prisma, orgId)` (o el body si es superadmin).
- **Problema:** Si el usuario es **superadmin sin org activa** (`activeOrgId` null y sin cookie), `tenantCtx.organizationId` es null. Aunque se obtenga `orgId` del proyecto, `createQuote()` usa `ctx.organizationId` para asignar la quote a una org; si es `undefined`, en core se hace `toQuoteData(input, organizationId!, preparedByUserId)` con `organizationId` undefined y la quote quedaría con `organizationId` inválido o fallaría en DB.

**Corrección:** Al llamar a `createQuote`, si somos superadmin y `tenantCtx.organizationId` es null pero tenemos `orgId` del proyecto, pasar un contexto con `organizationId: orgId` (por ejemplo construyendo un `tenantCtx` con `organizationId: orgId ?? tenantCtx.organizationId`) para que la quote se cree con la org del proyecto.

### 3.3 Duplicar cotización

- `duplicateQuote` usa `existing.visionLatamMarkupPct` y no vuelve a resolver por partner. Correcto: se mantiene el % de la quote original.

### 3.4 Listado y detalle de cotizaciones para partners

- List/GET/PATCH y PDF usan `quote.visionLatamMarkupPct` para calcular `basePriceForPartner` y no exponen factory cost. Alineado con la lógica de la plataforma.

### 3.5 Superadmin: lista de cotizaciones

- GET `/api/saas/quotes` sin `activeOrgId` (superadmin sin org seleccionada) devuelve todas las cotizaciones porque `orgScopeWhere(ctx)` devuelve `{}`. Correcto.

### 3.6 Dashboard y páginas que usan `project` / `client`

- Dashboard, proyectos, clientes, etc. usan `prisma.project.count()`, `prisma.project.findMany()`, `prisma.client.findMany()` con `where: { organizationId }`. En Prisma el campo es `organizationId` y está mapeado a `organization_id` en DB. Si en Neon la tabla sigue con `organizationId` (camelCase), esas queries fallan.

**Corrección:** Aplicar en Neon las migraciones de normalización (ver punto 2). No hace falta cambiar código si el schema Prisma y las migraciones están bien.

---

## 4. Resumen de pasos de corrección

| # | Acción | Prioridad |
|---|--------|-----------|
| 1 | **Aplicar migraciones en la base Neon de producción** (`packages/db`, `DATABASE_URL` de prod, `pnpm run migrate:deploy`). Comprobar que no queden pendientes. | Crítica |
| 2 | **Creación de quote por superadmin sin org:** En `apps/web/src/app/api/saas/quotes/route.ts`, al llamar a `createQuote`, si `tenantCtx.organizationId` es null y tenemos `orgId` (del proyecto), usar un contexto con `organizationId: orgId` para esa llamada (para que la quote quede asociada a la org del proyecto). | Alta |
| 3 | (Opcional) Unificar versión de `zod` en `packages/core` con la de `apps/web` (p. ej. ^3.23.8) y ejecutar tests. | Baja |
| 4 | Tras tocar `schema.prisma`, ejecutar siempre `pnpm run db:generate` antes de build/deploy. | Buena práctica |

---

## 5. Comprobaciones rápidas (debug)

- **Producción sigue fallando con “column X does not exist”:** La base enlazada por `DATABASE_URL` no tiene aplicadas las migraciones de normalización. Ejecutar `migrate:deploy` en esa base.
- **Superadmin crea quote y falla o la quote queda sin org:** Ver punto 2 de la tabla de correcciones (contexto con `organizationId` del proyecto).
- **Partner ve factory cost o % VL que no debería:** Revisar que en respuestas de quotes (list, GET, PATCH, PDF) para no-superadmin se use `quote.visionLatamMarkupPct` y no se devuelva `factoryCostTotal`/`factoryCostUsd` (sí `basePriceForPartner`).
- **Comisión en nueva quote no respeta la del partner:** Revisar que `getVisionLatamCommissionPctForOrg` se use en POST `/api/saas/quotes` y que el perfil del partner tenga `visionLatamCommissionPct` cuando corresponda.

Con estas correcciones (sobre todo 1 y 2), dependencias y flujos quedan alineados con el comportamiento esperado de la plataforma.
