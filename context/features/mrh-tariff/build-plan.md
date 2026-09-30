# Build plan — Tarif MRH NSIA

- **Status:** in-progress
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** —
- **Branch:** `feat/mrh-tariff` · **Worktree:** `.claude/worktrees/mrh-tariff` · **Ports:** app 3001 · db —
- **Depends on:** —
- **Spec:** [spec.md](spec.md) · **ADRs:** — · **Lessons applied:** L-011, L-001 (formateurs ‰/% dédiés), L-002 (types depuis le backend), L-003 (tri pour `fetchAllPages`), L-004 (cache avant affichage), L-005/L-009 (permissions), L-006 (compteurs)

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
- [x] **S8.** Contrôles finaux : `npx tsc --noEmit && pnpm lint && pnpm test`, grep AC-1 / AC-6

## Build notes (2026-09-30)

- Checks : `tsc` OK · `pnpm lint` OK · `pnpm test` 559/559 (baseline 518) · `pnpm check` : 22 fichiers déjà en écart sur `main`, aucun fichier de cette branche.
- AC-1 : aucun `post(`/`delete(` vers les 4 ressources de la grille (grep) ; tests « aucun bouton Ajouter/Supprimer ».
- AC-6 : `rentalValue` n'apparaît plus que dans un commentaire ; `rentalValueRate` / `rentalValuePremiumRate` sont d'autres champs, bien réels, de l'API.
- AC → tests : AC-2/AC-3 `LegalQualitiesScreen.test.tsx`, `WarrantiesScreens.test.tsx` ; AC-4 `WarrantiesScreens.test.tsx` (POURCENTAGE, CAPITAL, FORFAIT) ; AC-5 `accessories.test.tsx`, `ia-errors.test.ts` ; AC-6 `QuotationDetailDrawer.test.tsx` ; corps D-5 `mrh-tariff.test.ts`.
- Écran d'accessoires déplacé : `src/components/ia-products/accessories/` → `src/components/accessories/` (partagé IA/MRH).

## Review findings

> Last review: round 1 · 2026-09-30 · base `c38dff8` · HEAD `93bde04` (+ uncommitted: no) · verdict : prêt après le 🟡 (2 relecteurs : grille / accessoires + devis + navigation)

- [~] **R1-1** 🟡 Nom et description sans limite (colonnes varchar 255) → 409 « Cet élément existe déjà. » trompeur — `src/components/mrh-tariff/LegalQualityDialog.tsx:96`, `WarrantyDialog.tsx` (fix: 0d074c5)
- [~] **R1-2** ⚪ PUT réussi mais relecture en échec affiché comme un échec — `src/components/mrh-tariff/BaseRateDialog.tsx:39` (fix: 0d074c5)
- [~] **R1-3** ⚪ Nom technique (`capitalShare`) dans le bandeau d'erreur des lignes — `src/components/mrh-tariff/LineWarrantyDialog.tsx:84` (fix: 0d074c5)
- [~] **R1-4** ⚪ Erreurs serveur non effacées à la saisie (garantie, situation) — `src/components/mrh-tariff/WarrantyDialog.tsx:82` (fix: 0d074c5)
- [~] **R1-5** ⚪ Cas « permission connue mais absente » non testé sur la grille (L-009) — `src/components/mrh-tariff/LegalQualitiesScreen.test.tsx:32` (fix: 0d074c5)
- [~] **R1-6** ⚪ Mode et Obligatoire masqués sur téléphone sans relais (L-008) — `src/components/mrh-tariff/LineWarrantiesScreen.tsx:84` (fix: 0d074c5)
- [~] **R1-7** ⚪ Montant saisi avec espace (« 15 000 ») refusé — `src/lib/mrh-tariff.ts:77` (fix: 0d074c5)
- [~] **R1-8** ⚪ Cas « permission connue mais absente » non testé sur les accessoires (L-009) — `src/components/accessories/accessories.test.tsx:31` (fix: 0d074c5)
- [~] **R1-9** ⚪ Refus de suppression : la confirmation reste ouverte — `src/components/accessories/AccessoriesScreen.tsx:138` — réfuté par un test : la confirmation se ferme déjà d'elle-même après le refus (test « refus 422… » vérifie qu'elle a disparu) (fix: 0d074c5)
- [~] **R1-10** ⚪ (hors diff, fichier touché) 422 `ErrorResponse` « File is too large » lu comme `ImportResult` → plantage — `src/services/accessories.ts:97` (fix: 0d074c5)
- Écarts au plan, résolus dans la spec (D-7 révisée, D-8) — fix: 0d074c5

## Acceptance run

## Open questions

- La démo a-t-elle la #110 déployée ? — vérifié au `verify`.
