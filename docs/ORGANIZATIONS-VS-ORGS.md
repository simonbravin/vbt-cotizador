# Organizations vs orgs (tablas en Neon)

## Resumen

- **`organizations`**: es la tabla que usa la app (modelo `Organization` en `schema.prisma`). Parteners/tenants: nombre, tipo, país, estado, etc. **Hay que seguir usándola.**
- **`orgs`**: tabla distinta, solo definida en `schema.legacy.prisma` (modelo `Org`). Tiene slug, UOM, tarifas (rateS80, rateS150…), comisiones. **La app actual no la usa** (no hay referencias en el código activo).

No son el mismo valor duplicado: son dos entidades distintas. Si en el futuro querés unificar o deprecar `orgs`, se puede planear una migración de datos y dejar una sola tabla de “organización”.

## Detalle

| Aspecto | organizations | orgs |
|--------|----------------|------|
| **Schema activo** | Sí (`schema.prisma`, modelo `Organization`) | No (solo en `schema.legacy.prisma`, modelo `Org`) |
| **Uso en app** | Partner/tenant, invitaciones, miembros, proyectos, cotizaciones, etc. | Sin uso en el código actual |
| **Columnas típicas** | id, name, legal_name, organization_type, country_code, tax_id, email, status, created_at, updated_at | id, name, slug, createdAt, updatedAt, baseUom, weightUom, minRunFt, rateS80, rateS150, rateS200, rateGlobal, commissionPct, commissionFixed |
| **Ejemplo en Neon** | VBT Argentina SA (master_partner) | Vision Latam (vision-latam, con rates) |

**Conclusión:** No hace falta eliminar ninguna; la app solo depende de `organizations`. `orgs` puede tratarse como legacy o para un módulo futuro (p. ej. configuración de tarifas por “org”). Si quisieras unificar, habría que definir qué datos de `orgs` pasan a `organizations` o a otra tabla y migrar.
