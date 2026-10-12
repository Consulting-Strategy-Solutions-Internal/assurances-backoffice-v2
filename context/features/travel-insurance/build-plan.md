# Build plan — Assurance Voyage (EVO) au back-office

- **Status:** in-progress
- **Created:** 2026-10-12 · **Updated:** 2026-10-12
- **PR:** —
- **Branch:** `feat/travel-insurance` · **Worktree:** `.claude/worktrees/travel-insurance` · **Ports:** app 3001
- **Depends on:** —
- **Spec:** [spec.md](spec.md) · **Brief:** [brief.md](brief.md) · **ADRs:** — · **Lessons applied:** L-002 (types lus dans le backend), L-004 (cache avant toast), L-005 (masquer = `canKnown`, action gardée = `can`), L-006 (compteur), L-007/L-008 (colonnes mesurées), L-009 (droits `null` et absents testés), L-010, L-011 (motif 400, policyId 100, numéro 30), L-012 (filtres URL)

## Décisions

- **D-1** Page `/contrats/$subscriptionId` (tous produits) remplace `ContractDrawer` ; fiche client → la page ; `?contract=` redirige. — user
- **D-2** Bloc voyage (voyage, formule, voyageurs, badge, n° EVO, attestation via `policy-document`) ; pas de section renouvellement pour un voyage. — user / mission
- **D-3** « Actualiser depuis EVO » = `?refresh=true` au clic ; sans `evo` → « EVO indisponible » + données locales. — mission
- **D-4** Encadré Décision sur la page contrat, alimenté par la ligne trouvée dans `GET /subscriptions/travel?evoIssuanceStatus=TO_RECONCILE` (pages de 100, plafond 20 pages) ; `GET /subscriptions/travel/{id}` demandé au backend. — defaulted
- **D-5** `decisionState(item, now, canReconcile)` pur → `hidden` | `waiting(from)` | `ready` ; boutons visibles avec `can('subscription:reconcile')` (action gardée par le serveur, L-005). — defaulted
- **D-6** Rattacher (policyId ≤ 100), Relancer (confirmation), Refuser (motif ≤ 400 puis confirmation destructive) ; `mapTravelDecisionError` lit `errors.policyId` / `errors.subscriptionId` / `errors.reason` ; seul MISMATCH affiche `message`. — mission
- **D-7** Succès : `setQueryData` de la ligne, invalidation détail + liste, toast (L-004). — defaulted
- **D-8** `/contrats/voyage` : `TO_RECONCILE` par défaut, `?status=ALL|…&page=`, aucun `sort`, client = « Client #id » (lien), 404 → offre inactive. — user / defaulted
- **D-9** Menu Contrats › Supervision voyage, entrées filtrées une à une par leur droit connu, Ctrl+K, exception notée dans ui-registry. — user
- **D-10** `notificationTarget(n)` : `SUBSCRIPTION` → `/contrats/{id}`, `REFUND_REQUEST` → `/remboursements/{id}` sauf `PAYOUT_FUNDS_INSUFFICIENT` (pas de lien) ; support et sinistre inchangés. — user / defaulted
- **D-11** `/remboursements/$refundId` : alerte retrouvée dans les 500 notifications les plus récentes (5 pages de 100, `createdAt,desc`) ; aide-mémoire ; formulaire toujours proposé ; validation identique au normaliseur backend. — user / defaulted
- **D-12** Retour de la page contrat : `?from=voyage` (+ filtres) → supervision ; sinon fiche client. — defaulted
- **D-13** Types écrits à la main depuis `assurances-backend-v2@cfe620a`. — code

## Code context

- `src/components/clients/ContractDrawer.tsx` (+ tests) — contenu à déplacer dans la page contrat.
- `src/routes/_auth/clients_.$clientId.tsx` — ouvre le tiroir via `?contract=` ; à rediriger.
- `src/routes/-clients-api.test.tsx:69-84, 313-350` — tests du `?contract=` à réécrire.
- `src/routes/_auth/contrats.modifications*.tsx` — modèles liste / détail (validateSearch zod, `XxxContent`, Gate).
- `src/services/subscriptions.ts` — types contrat à étendre (`travel`, `TRAVEL`).
- `src/components/notifications/NotificationsMenu.tsx:65-81` — liens profonds en dur.
- `src/components/dashboard/Sidebar.tsx:90-96, 360-368` — groupe Contrats gardé par `amendment:read-all`.
- `src/components/search/` — `PAGES` de la recherche globale.
- `src/lib/api-error.ts`, `src/lib/amendments.ts:693-860` — modèles de mappers d'erreurs et d'erreurs PDF.
- `src/lib/claims.ts:152` `formatClaimDate` ; `src/lib/utils.ts:35` `formatFcfa`.
- `context/project/ui-registry.md` — recettes liste / détail, états.

## Steps

- [x] **S1.** Types + services voyage et logique pure — files: `src/services/subscriptions.ts` (`travel`, `InsuranceType`, `getSubscription(id, {refresh})`), `src/services/travel.ts` (liste, attach/retry/refuse, `findTravelSupervisionItem`, `downloadTravelCertificate`), `src/lib/travel.ts` (libellés/teintes EVO, `decisionState`, `isGaveUp`, `mapTravelDecisionError`, `travelSearchSchema`), fixtures `src/lib/travel.fixtures.ts` — satisfies: AC-6, AC-7…AC-10 (logique) — verify: `src/lib/travel.test.ts`, `src/services/travel.test.ts`
- [x] **S2.** Remboursements, logique pure + service — files: `src/lib/refunds.ts` (`normalizeIvorianNumber`, `validateRefundDestination`, `mapRefundDestinationError`, `findRefundAlert`), `src/services/refunds.ts` — satisfies: AC-12 (logique) — verify: `src/lib/refunds.test.ts`
- [ ] **S3.** Page contrat `/contrats/$subscriptionId` reprenant le tiroir ; fiche client → page ; `?contract=` redirige ; suppression de `ContractDrawer` (tests portés) — files: `src/routes/_auth/contrats_.$subscriptionId.tsx`, `src/components/contracts/*`, `clients_.$clientId.tsx` — satisfies: AC-1, AC-12 (D-12) — verify: `src/routes/-contract-detail.test.tsx`, tests portés, `-clients-api.test.tsx`
- [ ] **S4.** Bloc voyage + actualisation EVO + attestation — files: `src/components/contracts/TravelSection.tsx` — satisfies: AC-2, AC-3, AC-4, AC-14 — verify: tests de composant
- [ ] **S5.** Encadré Décision + 3 dialogues — files: `src/components/contracts/TravelDecisionPanel.tsx`, dialogues — satisfies: AC-6…AC-10 — verify: tests (droit `null` / connu absent / présent, avant / après `reconcilableFrom`, chaque 422)
- [ ] **S6.** Liste `/contrats/voyage` — files: `src/routes/_auth/contrats.voyage.tsx` — satisfies: AC-5 — verify: `src/routes/-travel-supervision.test.tsx`
- [ ] **S7.** Menu + Ctrl+K + ui-registry — files: `Sidebar.tsx`, `src/components/search/*`, `context/project/ui-registry.md` — satisfies: AC-13 — verify: test Sidebar
- [ ] **S8.** `notificationTarget` + NotificationsMenu — files: `src/lib/notifications.ts`, `NotificationsMenu.tsx` — satisfies: AC-11 — verify: `src/lib/notifications.test.ts`
- [ ] **S9.** Page `/remboursements/$refundId` — files: `src/routes/_auth/remboursements_.$refundId.tsx`, `src/components/refunds/*` — satisfies: AC-12 — verify: `src/routes/-refund-detail.test.tsx`
- [ ] **S10.** Contrôles complets + `generate-routes` — verify: `npx tsc --noEmit && pnpm lint && pnpm test`

## Review findings

## Acceptance run

## Timeline

## Follow-up

## Open questions

- Backend : `GET /subscriptions/travel/{id}` (éviter le parcours de la liste TO_RECONCILE, D-4) — unblocked by: équipe backend.
- Backend : cause structurée sur `REFUND_ATTENTION` ou `GET /refunds/{id}` (afficher le bon formulaire/aide sans texte libre) — unblocked by: équipe backend.
- Backend : filtre `resourceType`/`resourceId` sur `GET /notifications` (D-11) — unblocked by: équipe backend.
- Recette du rattachement réel (EVO UAT, préprod) — unblocked by: accord de l'utilisateur + compte de test.
- NSIA : seul l'ADMIN tranche (backend `questions-ouvertes.md` A.11) — unblocked by: NSIA.
