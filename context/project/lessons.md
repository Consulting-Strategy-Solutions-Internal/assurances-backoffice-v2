# Lessons

> Mistakes this project has already made, distilled from reviews. **Read before planning or writing code.**
> Each lesson is a rule to follow. Written by the `review` skill; read by `architect`, by implementing agents, and by reviewers.

## Active

### L-001: Never change what a shared helper means — add a helper named after its use instead
- **Why:** `formatNumber` (`src/lib/utils.ts`) was made integer-only for FCFA amounts; the IA Barèmes screen used it for ‰ rates, so 0,25 ‰ displayed « 0 » and an admin could « fix » a correct tariff. Changing a shared helper's semantics silently breaks every caller.
- **How to apply:** one formatter per use (`formatFcfa`, `formatPermille`, `formatPercent`…); before changing any shared helper, grep its callers and check each one.
- **Seen:** 2026-09-30 `ux-fixes` R1-1 (🔴)
- **Seen:** 2026-09-30 `responsive` R1-1 — `RowChevron` made sticky + opaque for every caller; selected-row tint lost on 4 tables
- **Enforced by:** partly — `formatNumber` renamed `formatInteger` (no generic number formatter left in `utils.ts`); still a rule, not a check

### L-002: Type every request and response from the backend's OpenAPI, never from memory or guesses
- **Why:** the scheme wizard sent `productId` when the API had moved to `product` (400 « Validation failed »); the quotation drawer read invented `riskClassSnapshot` keys and treated `warrantiesSnapshot` (an object `{lines}`) as an array, so the detail the user asked for never showed.
- **How to apply:** check shapes against `https://<backend>/api/v3/api-docs` (see `context/memory.md`) when writing or touching a service; no `unknown` for snapshot fields the UI renders.
- **Seen:** 2026-09-30 `ux-fixes` R1-8, R1-9; bug « Validation failed » on `/commission-schemes`
- **Seen:** 2026-09-30 `ux-fixes` round 2 — R1-16 (`categoryId` sent to `GET /products`), R2-3 (`ProductSnapshot` fields and relationship enum not in the OpenAPI)
- **Enforced by:** —

### L-003: Always pass a newest-first `sort` to `fetchAllPages`
- **Why:** without `sort`, the backend orders by `id,ASC`; past the 2 000-row cap the oldest rows are kept and the « most recent » note is false (dashboard, Cotations).
- **How to apply:** every `fetchAllPages` call passes `sort: 'createdAt,desc'` (or the list's natural newest-first key) through the service.
- **Seen:** 2026-09-30 `ux-fixes` R1-2
- **Seen:** 2026-09-30 `ux-fixes` round 2 — R2-9 (global search: partners, admins, support tickets loaded without a newest-first sort)
- **Enforced by:** —

### L-004: Before offering « Annuler » after a mutation, write the server's response into the cache
- **Why:** the permission editor offered « Annuler » while `['roles-all']` still held the pre-mutation state (invalidation refetch pending); the undo read that stale state and silently did nothing on a shared role.
- **How to apply:** in `onSuccess`, `setQueryData` with the returned entity (then invalidate), or await the refetch before showing the undo; if an undo is skipped, say so.
- **Seen:** 2026-09-30 `ux-fixes` R1-12
- **Enforced by:** —

### L-005: When a permission decides what to hide, treat unknown permissions as denied
- **Why:** `can()` answers `true` while the permission set is unknown (« unknown → allow », fine for letting the server decide on actions). The risk-class status filter reused it to decide whether to show an option the backend ignores for read-only users; for exactly those users (no `iam:read`, set unknown) the misleading filter came back.
- **How to apply:** gate on `permissions?.has(code) === true` (known and granted) whenever hiding/forcing UI depends on the permission; keep « unknown → allow » only for actions the server will refuse anyway.
- **Seen:** 2026-09-30 `ux-fixes` R1-5 (reopened round 2)
- **Enforced by:** —

### L-006: A result counter shows the filtered total, never the length of the current page
- **Why:** « 20 types » was the page slice (`rows.length`) while the KPI said 30; the audit had already found the same on Permissions (« 20 » vs 60 in the KPIs). Two numbers for the same set make an admin doubt both.
- **How to apply:** counters read the filtered set (`matching.length`) or the server's `totalElements`; the page slice is only for rendering rows.
- **Seen:** 2026-09-30 audit (Permissions), `ux-fixes` R1-10 (reopened round 2)
- **Enforced by:** —

### L-007: Two sticky table columns must fit together in the narrowest visible width
- **Why:** Schémas and Distributions stuck the first column left and the action column right; at 360 px their sum (≈ 355–373 px) exceeded the 326 px visible, so the middle columns (Taux négocié, Statut) could never be scrolled into view.
- **How to apply:** only stick both sides when left + right widths fit in the smallest content width (≈ 326 px), keeping ≥ 150 px free; otherwise pass `stickyFrom="sm"` (`DataTableHead`/`DataTableCell`) on one side — it only sticks from 576 px of content — or switch to cards. Measure at 360 with real rows.
- **Seen:** 2026-09-30 `responsive` R1-3
- **Seen:** 2026-09-30 `responsive` round 2 — Portefeuilles, Accessoires IA (two sticky sides) and Schémas (right sticky alone 213 px)
- **Enforced by:** —

### L-008: Choose column-hiding thresholds from the measured table width, never by guess
- **Why:** `hideBelow="lg"/"xl"` was set on Sinistres and Cotations columns although those tables fit at 1024/1280 (audit measured 672 / 866 px); desktop users lost Produit, Déclaré par, Émis par for nothing.
- **How to apply:** measure the table's natural width (Playwright sweep) and hide a column only below the content width where the table stops fitting; content thresholds are 576/672/896/1024 px (`sm/md/lg/xl` of `hideBelow`), not viewport breakpoints.
- **Seen:** 2026-09-30 `responsive` R1-4
- **Enforced by:** —

## Enforced

<!-- Lessons now caught automatically (lint rule, test, type). One line each — agents no longer need to remember them. -->
