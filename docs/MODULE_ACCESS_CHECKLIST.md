# Module Access Checklist

Use this checklist for every new partner module or endpoint.

## 1) Domain Contract
- [ ] Define/confirm module key in core effective visibility resolver.
- [ ] Default behavior is explicit (`true` when unset unless product requires otherwise).

## 2) UI Enforcement
- [ ] Sidebar visibility mapped by route.
- [ ] Layout-level direct URL protection added.
- [ ] Any special role rules are enforced in layout/page guards.

## 3) API Enforcement
- [ ] Route handlers use shared module guard helper (`requireModuleRouteAuth`) or SaaS wrapper module option.
- [ ] Subroutes and file/download endpoints are included (not only collection routes).
- [ ] Superadmin bypass behavior is preserved where required.

## 4) Behavioral Consistency
- [ ] Legacy and SaaS namespaces apply the same module guard policy.
- [ ] 401/403 behavior is consistent and predictable.
- [ ] No ad-hoc auth logic duplicates shared helper behavior.

## 5) Quality
- [ ] Unit tests for visibility resolution (global + partner override).
- [ ] Integration checks for allowed/blocked access paths.
- [ ] Lint and tests pass for touched files.

## 6) Documentation
- [ ] Route homogenization backlog updated if legacy/canonical parity changed.
- [ ] Any deprecation notes are documented with migration path.

