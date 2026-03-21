# Engineering Request System

Backend foundation for partner engineering requests. All requests are tenant-scoped by `activeOrgId`.

---

## 1. Architecture

- **Core service:** `packages/core/src/services/engineering.ts`
- **API routes:** `apps/web/src/app/api/saas/engineering/`
- **Scoping:** Every list/create/update/file/deliverable operation uses `getTenantContext()` / `requireActiveOrg()` and passes `organizationId: ctx.activeOrgId` to the core. Platform superadmin can operate with cross-tenant context where applicable.

---

## 2. States

| Status        | Description                    |
|---------------|--------------------------------|
| `draft`       | Request created, not submitted |
| `submitted`   | Submitted for review           |
| `in_review`   | Under review                   |
| `pending_info`| Awaiting info from partner     |
| `needs_info`  | Same as above (alias)          |
| `in_progress` | Work in progress               |
| `completed`   | Completed                      |
| `delivered`   | Delivered to partner           |
| `rejected`    | Rejected                       |

New requests can be created with `status: "draft"` (default) or `"submitted"`.

---

## 3. API Endpoints

| Method | Route | Description |
|--------|--------|-------------|
| POST   | `/api/saas/engineering` | Create request (body: projectId, requestNumber, optional status, requestType, wallAreaM2, systemType, targetDeliveryDate, engineeringFeeValue, notes). Logs `engineering_request_created`. |
| GET    | `/api/saas/engineering` | List requests (query: projectId, status, limit, offset). Tenant-scoped. |
| GET    | `/api/saas/engineering/[id]` | Get one request with project, files, deliverables. |
| PATCH  | `/api/saas/engineering/[id]` | Update request (status, assignedToUserId, requestType, wallAreaM2, systemType, targetDeliveryDate, engineeringFeeValue, notes). |
| POST   | `/api/saas/engineering/[id]/files` | Add file (body: fileName, fileType, fileSize, fileUrl as storageUrl). |
| POST   | `/api/saas/engineering/[id]/upload` | Multipart `file` — upload to R2 under the request’s partner org (partner or superadmin). |
| POST   | `/api/saas/engineering/[id]/deliverables` | **Superadmin only.** Register a revision (body: `fileUrl`, optional `fileName`, `title`, `description`). Returns `{ deliverable, request }`. |
| GET    | `/api/saas/engineering/[id]/deliverables/[deliverableId]/file` | Signed download for a deliverable. |

Partner `POST .../files` is **rejected for superadmins** (they use revisions). It is only allowed when the request status is **draft**, **submitted**, **needs_info**, or **pending_info**. Each successful partner file registration appends a **partner-visible timeline** entry. Each superadmin deliverable appends a **partner-visible** revision entry (same timeline).

---

## 4. Files

- Stored in `EngineeringFile`: `fileName`, `fileType`, `fileSize`, `fileUrl` (storage URL).
- Upload flow: client uploads to storage (e.g. S3), then POST to this API with the resulting `fileUrl`.

---

## 5. Deliverables

- Stored in `EngineeringDeliverable`: `deliverableType` (from title), `title`, `description`, `fileName` (derived from fileUrl), `fileUrl`, `version`.

---

## 6. Activity Log

- **engineering_request_created** — when a new request is created via POST (entityType: `engineering_request`, entityId: request id).

---

## 7. UI (partner dashboard)

- **List:** `/engineering` — `EngineeringListClient` lists tenant-scoped requests via `/api/saas/engineering`.
- **Detail:** `/engineering/[id]` — detail and status updates.
- **Create:** `/engineering/new` — new request form posting to `/api/saas/engineering`.

## 8. Remaining gaps

- File upload may still use storage URL from client after upload (see API docs).
- Legacy routes under `/api/engineering` (if any) not replaced; prefer `/api/saas/engineering`.
