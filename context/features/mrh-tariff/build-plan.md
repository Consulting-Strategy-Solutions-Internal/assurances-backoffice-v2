# Build plan — Tarif MRH NSIA

- **Status:** in-progress
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** —
- **Branch:** `feat/mrh-tariff` · **Worktree:** `.claude/worktrees/mrh-tariff` · **Ports:** app 3001 · db —
- **Depends on:** —
- **Spec:** [spec.md](spec.md) · **ADRs:** — · **Lessons applied:** L-001 (formateurs ‰/% dédiés), L-002 (types depuis le backend), L-003 (tri pour `fetchAllPages`), L-004 (cache avant affichage), L-005/L-009 (permissions), L-006 (compteurs)

## Code context
- `src/components/ia-products/accessories/` — écran IA à rendre générique (D-2)
- `src/routes/_auth/produits-ia.ia-standard.tsx` — gabarit à onglets à reproduire
- `src/components/dashboard/Sidebar.tsx`, `src/components/search/search-logic.ts` — navigation
- `src/services/quotations.ts`, `src/components/quotations/QuotationDetailDrawer.tsx` — snapshot MRH
- `src/lib/ia-errors.ts` — traduction des codes d'erreur

## Steps
- [x] **S1.** Services + types MRH (`src/services/mrh-tariff.ts`) d'après les DTO backend ; corps de PUT selon D-5 ; codes d'erreur FR — verify: tests des constructeurs de corps
- [x] **S2.** Accessoires génériques par produit : écran, formulaire (choix du produit), import (productCode du produit), 422 LAST_ACCESSORY, bandeau vide — satisfies AC-5 — verify: tests composants
- [x] **S3.** Route `/produits-mrh/mrh-standard` + onglets, menu, recherche globale — verify: `generate-routes`, tsc
- [x] **S4.** Onglet Situations & taux (UC-1, UC-2) — AC-2, AC-3, D-7 — verify: tests modifier/relire/erreur champ
- [x] **S5.** Onglet Garanties (UC-3) — AC-2 — verify: tests
- [x] **S6.** Onglet Garanties par situation (UC-4) — AC-2, AC-4 — verify: tests par mode
- [x] **S7.** Tiroir des cotations : `rentalRisks`, loyer × multiplicateur, occupation, CAPITAL ; suppression de `createMrhQuotation` — AC-6 — verify: test du tiroir
- [ ] **S8.** Contrôles finaux : `npx tsc --noEmit && pnpm lint && pnpm test`, grep AC-1 / AC-6

## Review findings

## Acceptance run

## Open questions
- La démo a-t-elle la #110 déployée ? — vérifié au `verify`.
