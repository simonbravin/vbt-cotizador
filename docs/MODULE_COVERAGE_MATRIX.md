# Partner Module Coverage Matrix

Legend:
- `yes`: enforced
- `partial`: enforced in main paths, legacy/special path pending

| Module | Sidebar | Layout URL guard | API guard |
|---|---|---|---|
| dashboard | yes | app shell + module visibility | yes (`/api/saas/dashboard/*`) |
| clients | yes | yes (`(dashboard)/clients/layout.tsx`) | yes (`/api/clients*`) |
| engineering | yes | yes | yes (`/api/saas/engineering*`) |
| projects | yes | yes (`(dashboard)/projects/layout.tsx`) | yes (`/api/projects*`, `/api/saas/projects*`) |
| quotes | yes | yes (`(dashboard)/quotes/layout.tsx`) | yes (`/api/quotes*`, `/api/saas/quotes*`) |
| sales | yes | yes | yes (`/api/sales*`) |
| inventory | yes | yes (`(dashboard)/inventory/layout.tsx`) | yes (`/api/saas/inventory*`) |
| documents | yes | yes | yes (`/api/saas/documents*`) |
| training | yes | yes (`(dashboard)/training/layout.tsx`) | yes (existing training visibility guards in SaaS training routes) |
| reports | yes | yes | yes (`/api/reports*`) |
| settings | yes | yes (`(dashboard)/settings/layout.tsx`) | partial (critical settings flows have role checks; module-key propagation can be extended endpoint-by-endpoint) |

## Notes
- Effective visibility source is resolved in core and merged global+partner override.
- Superadmin bypass is preserved by design.
- Canonical route migration tracking is in [ROUTE_HOMOGENIZATION_BACKLOG.md](./ROUTE_HOMOGENIZATION_BACKLOG.md).

