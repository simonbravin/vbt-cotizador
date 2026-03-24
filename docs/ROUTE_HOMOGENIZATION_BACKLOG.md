# Route Homogenization Backlog

This file tracks the namespace alignment between legacy endpoints (`/api/*`) and canonical SaaS endpoints (`/api/saas/*`) for partner modules.

## Status Legend
- `aligned`: same module-guard policy and behavior.
- `partial`: guard policy aligned, but still using legacy response shape/contracts.
- `pending`: no canonical equivalent or migration not started.

## Clients
- Legacy: `/api/clients`, `/api/clients/[id]`, `/api/clients/stats` -> `partial`
- Canonical SaaS: `pending` (`/api/saas/clients*` not implemented yet)
- Notes:
  - Module guard now aligned to `clients`.
  - Keep legacy until canonical SaaS contract is introduced.

## Projects
- Legacy: `/api/projects*` -> `aligned` (module guard `projects` applied)
- SaaS: `/api/saas/projects*` -> `aligned`
- Next step:
  - Consolidate response payload parity and eventually route frontends only through SaaS namespace.

## Quotes
- Legacy: `/api/quotes*` -> `aligned` (module guard `quotes` applied)
- SaaS: `/api/saas/quotes*` -> `aligned`
- Next step:
  - Continue deprecating legacy create/update surfaces in favor of SaaS canonical handlers.

## Inventory
- SaaS only in partner domain: `/api/saas/inventory*` -> `aligned` (module guard `inventory` via `withSaaSHandler`)
- Next step:
  - Keep as canonical; no legacy mirror required unless external integrations demand it.

## Sales
- Legacy partner endpoints under `/api/sales*` -> `aligned`
- Notes:
  - Full subtree already guarded with module key `sales`.

## Documents / Engineering / Reports / Training
- `aligned` in current active surfaces.
- Notes:
  - Keep using shared guard helpers to prevent drift between namespaces.

## Deprecation Policy
1. Add canonical SaaS endpoint first.
2. Ensure same module guard + role checks + error shape.
3. Migrate frontend calls.
4. Mark legacy endpoint as deprecated.
5. Remove legacy endpoint only after zero usage verification.

