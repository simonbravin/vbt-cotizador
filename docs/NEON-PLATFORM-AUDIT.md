# Auditoría: Neon, lógica de plataforma, código y frontend

Este documento resume el alineamiento entre la base Neon, la lógica de negocio que describiste (superadmin vs partners, precios por partner) y el código/frontend.

---

## 1. Modelo de negocio (resumen)

- **Superadmin** (admin@visionbuildingtechs.com): uno solo. Define factory cost global y **comisión Vision Latam por partner** (% o fijo). Los partners **nunca** ven factory cost ni config global.
- **Partners**: reciben “base price” = factory cost + comisión VL (la que el superadmin fija **para ese partner**). Pueden fijar su propia comisión hasta 20% sobre ese base price. Cotizan por Revit o m²; no setean tarifas USD/m².
- **Precios/tarifas**: superadmin setea factory cost y comisión VL; por partner puede ser distinto. Eso implica **seteos por partner** (hoy no del todo soportado en DB/código).

---

## 2. Base de datos (Neon) vs schema Prisma

### 2.1 Tablas y columnas

Prisma usa `@map("snake_case")` en el schema. En Neon, si alguna tabla se creó con camelCase (p. ej. por un push anterior), Prisma falla con “column X does not exist”.

**Migraciones de normalización ya aplicadas:**

| Tabla         | Migración | Columnas normalizadas |
|---------------|-----------|------------------------|
| users         | 20250316, 20250318 | updated_at, created_at, etc. |
| org_members   | 20250319, 20250320 | orgId → organization_id, + status, invited_by_user_id, etc. |
| org_members   | 20250322* | Enum OrgMemberRole: org_admin, sales_user, technical_user, viewer |
| projects      | 20250323  | organizationId → organization_id, clientId → client_id |
| clients       | 20250324  | organizationId → organization_id (si existía camelCase) |

\* 20250322 agrega valores al enum; no renombra columnas.

**Recomendación:** Si en producción ves otro error tipo “column X does not exist”, revisar si esa tabla en Neon tiene la columna en camelCase y añadir una migración similar (renombrar a snake_case según el `@map` del schema).

### 2.2 Tablas existentes y uso

- **platform_config**: una fila global. `config_json` guarda `pricing.visionLatamCommissionPct` (y otros defaults). **Hoy es un solo % para todos los partners.**
- **partner_profiles**: una fila por organización (partner). Tiene `margin_min_pct`, `margin_max_pct`, `entry_fee_usd`, `training_fee_usd`, `sales_target_annual_usd`, etc. **No tiene** campo de comisión Vision Latam por partner ni tarifas/factory por partner.
- **organizations**, **org_members**, **users**, **quotes**, **projects**, **clients**, **engineering_requests**, **documents**, **training_***, **activity_logs**: existen y están mapeados en el schema. Tras las migraciones de normalización, las consultas que usan `organization_id` / `client_id` en `projects` y `clients` deberían ser coherentes con Neon.

---

## 3. Gaps de lógica: precios y comisión por partner

### 3.1 Comisión Vision Latam por partner

- **Hoy:** Se usa solo `platform_config.config_json.pricing.visionLatamCommissionPct` (global). Todas las respuestas de quotes (basePriceForPartner, PDF, list, GET/PATCH) usan ese mismo % (o 20 por defecto).
- **Objetivo:** “Seteo mi % o fixed value de comisión **para cada partner en particular**.”
- **Gap:** No hay en DB ni en código un “Vision Latam commission % (o fijo) **por partner**”.

**Opciones:**

1. **Extender PartnerProfile**  
   Añadir en `partner_profiles` por ejemplo:
   - `vision_latam_commission_pct` (Float, nullable)  
   - `vision_latam_commission_fixed_usd` (Float, nullable)  
   Si son null, se usa el valor global de `platform_config`. Si están seteados, se usan para ese partner.

2. **Nueva tabla**  
   Ej. `partner_pricing` (organization_id, vision_latam_commission_pct, vision_latam_commission_fixed_usd, rate_s80, rate_s150, rate_s200, rate_global, …) para tarifas y comisión VL por partner. Más flexible si más adelante quieres más campos por partner.

Recomendación: opción 1 para no multiplicar tablas; migración que agregue las columnas y luego cambiar el código que hoy lee solo `platform_config` para que, cuando exista `organizationId` (partner), consulte primero PartnerProfile y use override si existe.

### 3.2 Tarifas / factory cost por partner

- **Hoy:** Tarifas (rateS80, rateS150, rateS200, rateGlobal) y factory cost se resuelven en el quote engine desde `orgDefaults` (que puede venir de config global o de algún otro lugar según cómo se llame). No hay en el schema una tabla “tarifas por partner”.
- **Objetivo:** “Yo seteo las tarifas para cada partner” y “factory cost que yo como superadmin seteo para ellos”.
- **Gap:** No hay modelo ni tabla que guarde “tarifas USD/m² por partner” ni “factory cost por partner”. Si quieres que cada partner tenga sus propias tarifas (y no solo un global), hace falta:
  - O bien columnas en `partner_profiles` (o en una tabla de pricing por partner) para rate_s80, rate_s150, rate_s200, rate_global, y/o factory cost base,
  - O bien que “factory cost” siga siendo global y solo la comisión VL sea por partner (que ya cubre “base price = factory + mi comisión para ese partner”).

Para un primer paso, suele bastar con **comisión VL por partner** (apartado anterior); las tarifas pueden seguir siendo globales y luego extenderse a por-partner si lo necesitas.

---

## 4. Código: dónde se usa config global vs por partner

### 4.1 Comisión Vision Latam (hoy todo global)

- **APIs que leen `platform_config` para commission %:**  
  - `apps/web/src/app/api/saas/quotes/route.ts` (lista: basePriceForPartner)  
  - `apps/web/src/app/api/saas/quotes/[id]/route.ts` (GET y PATCH: basePriceForPartner)  
  - `apps/web/src/app/api/quotes/[id]/route.ts` (GET quote)  
  - `apps/web/src/app/api/quotes/[id]/pdf/route.ts` (PDF: basePriceForPartner, ocultar factory cost)

En todos se hace algo como:

```ts
const platformRow = await prisma.platformConfig.findFirst({ select: { configJson: true } });
const commissionPct = raw?.visionLatamCommissionPct ?? 20;
// basePriceForPartner = factory * (1 + commissionPct / 100)
```

Para soportar comisión por partner habría que:

- Recibir `organizationId` (del tenant/quote) y, si existe, leer `PartnerProfile` (o la tabla de pricing por partner) y usar `vision_latam_commission_pct` / fixed si están definidos; si no, seguir usando `platform_config`.

### 4.2 Quote engine y wizard

- **packages/core/src/quote-engine.ts:** Recibe `commissionPct` y `commissionFixed` en el input; no lee DB. Quien arma el input (wizard/API) es quien debe pasar el % correcto (global o por partner cuando exista).
- **Frontend wizard (step4-commission, etc.):** El partner setea su propia comisión (hasta 20%); el “base” sobre el que se aplica debería ser ya “factory + comisión VL para ese partner”. Hoy ese base se calcula en backend/PDF con el % global; cuando haya % por partner, el backend debe usar ese % al calcular basePriceForPartner y al persistir/recuperar el quote.

### 4.3 Protección de datos superadmin

- **platform_config:** GET/PATCH solo con `requirePlatformSuperadmin()`; partners no pueden leer ni escribir. Correcto.
- **Quotes:** Para no-superadmin se devuelve `factoryCostTotal: null`, `factoryCostUsd: null` y `basePriceForPartner`; PATCH no permite cambiar `factoryCostTotal` ni `visionLatamMarkupPct`. Correcto.
- **Listado de quotes:** Se sanitiza la lista para partners (mismo criterio). Correcto.

---

## 5. Frontend: visualización y comportamiento por partner

### 5.1 Dónde se muestran datos por partner

- **Dashboard partner:** Métricas (proyectos, cotizaciones, etc.) y objetivo de ventas (`/api/saas/dashboard/goal`) vienen de `PartnerProfile` y quotes de la org del usuario; todo scoped por `organizationId`. Correcto.
- **Quotes:** Detalle y lista usan `basePriceForPartner` cuando el usuario no es superadmin; no se muestra factory cost. Correcto.
- **Configuración global (tarifas, comisión VL):** Solo en Superadmin → Configuración global; el front solo llama `/api/saas/platform-config` desde ahí (y la API exige superadmin). Los partners no ven ni ese menú ni esos campos. Correcto.

### 5.2 Dónde los seteos de superadmin deberían afectar por partner

- **Hoy:** El único “seteo” que impacta a todos por igual es `visionLatamCommissionPct` en platform_config. No hay UI de “comisión VL para este partner” ni lectura de comisión por partner en las APIs de quote.
- **Cuando exista comisión por partner en DB:**  
  - Superadmin: en el detalle/edición del partner (o en una sección “Precios / Comisión”) habría que mostrar y guardar `vision_latam_commission_pct` (y opcionalmente fixed).  
  - APIs de quote (list, GET, PATCH, PDF): deben usar ese % (o fixed) para ese `organizationId` cuando exista; si no, fallback al global.  
  - Frontend del partner no debe mostrar ni editar la comisión VL; solo su propia comisión (hasta 20%) y el resultado (base price, FOB, etc.) ya calculado con la comisión VL que definió superadmin.

### 5.3 Sidebar y rutas

- Partners ven solo el sidebar del portal partner (Dashboard, Proyectos, Clientes, Cotizaciones, etc.); no ven “Configuración global” ni “Administración” del superadmin. Correcto tras la separación de roles y redirects.

---

## 6. Resumen de acciones sugeridas

1. **Neon:** Mantener migraciones aplicadas (projects, clients, org_members, users, enums). Si aparece otro “column X does not exist”, añadir migración de normalización para esa tabla/columna según el `@map` del schema.
2. **Comisión por partner:** Decidir si se usa PartnerProfile o tabla nueva; añadir columnas (p. ej. `vision_latam_commission_pct`, `vision_latam_commission_fixed_usd`) y migración; actualizar APIs de quotes (y PDF) para leer primero override por partner y luego global.
3. **Tarifas/factory por partner (opcional):** Si se requiere “tarifas exclusivas por partner”, añadir campos o tabla y que el quote engine reciba esos valores por org; por ahora la comisión VL por partner suele ser suficiente para el modelo que describiste.
4. **Frontend superadmin:** Cuando exista comisión por partner en DB, añadir UI en el flujo de edición del partner para setear ese % (y opcionalmente fijo) y que el resto del frontend siga mostrando variables correctas por partner sin exponer factory cost ni config global.

Este documento se puede actualizar cuando se implemente la comisión por partner y, si aplica, las tarifas por partner.
