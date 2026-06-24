# Project Memory

> Project-local memory for agents. Read this at the start of a session; update it at the end.

## Decisions
- OpenAPI spec lives at `http://localhost:8080/api/v3/api-docs` — the base URL includes `/api` (`VITE_API_URL=http://localhost:8080/api`). The bare `/v3/api-docs` 404s. (2026-06-24)

## Patterns
- Forms use `@tanstack/react-form` + `zod`, with per-field `onBlur`/`onSubmit` validators and the shared `FormField` / `FormDialog` helpers. Canonical example: `src/components/users/AddUserModal.tsx`.
- ESLint is strict — two rules bite often: `@typescript-eslint/no-unnecessary-condition` (no `?? ''` / optional-chaining on values typed non-nullable; use `.charAt(0)` instead of `str[0] ?? ''`) and `import/consistent-type-specifier-style` (no inline `type` specifiers — use a separate `import type { X }` statement). Run `npx tsc --noEmit && npx eslint <files>` before declaring done.
- Routing is file-based (TanStack Router). After adding/removing a route file under `src/routes/`, run `npm run generate-routes` to regenerate `src/routeTree.gen.ts`.

## Progress
- Admin self-service profile shipped: route `src/routes/_auth/profil.tsx` (linked from the Sidebar account dropdown as "Mon profil"), with `src/components/profile/ProfileInfoForm.tsx` (PUT `/users/{id}`) and `ProfilePasswordForm.tsx` (PUT `/users/me/password`); service fns `getUser`/`updateUser`/`changeMyPassword` in `src/services/users.ts`.
- NOT verified live in the browser yet. Open question: whether the admin role's permissions allow `GET`/`PUT /users/{id}` — if guarded by `iam:read`/`iam:write`, the page still loads (falls back to the `/auth/me` lightweight profile) but the info-save could 403. The password endpoint `/users/me/password` is self-scoped and unaffected.
