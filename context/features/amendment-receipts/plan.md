# Modifications de contrat, lot 2 — plan

**Status:** done · **Spec :** `spec.md` · **PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/8
**Lessons applied:** L-001…L-010

## Étapes
- [x] Types `AmendmentListItem`, `clientName` nullable ; service liste
- [x] Liste : colonnes N° de police et Client (« Client supprimé » grisé), cartes mobiles, icône PDF
- [x] Détail : « Télécharger la quittance » / « PDF disponible après le paiement » / « Pas de PDF »
- [x] Erreurs PDF (police et quittance) lues d'après le `message` du corps blob (`readBlobErrorBody`)
- [x] Tests simulés (ristourne téléchargée, hausse puis payée, pas de PDF, 5 erreurs, n° de police et client par ligne)
- [x] Vérification en lecture seule contre la démo une fois la #111 déployée (2026-09-30, voir ci-dessous)

## Vérifications faites (2026-09-30)
- Playwright, GET simulés : liste et détail (ristourne, appel à payer, appel payé) à 360, 390 et 1280 px, et sans JavaScript à 390 px : 0 px de débordement.
- **Chaîne réelle** (dev + proxy vers la démo, requête du PDF de l'avenant n° 1 détournée) : vers `…/subscriptions/999999/policy-document` → la démo répond 404 `Subscription not found with id: 999999` → l'écran affiche « Contrat introuvable. », sans Réessayer ; vers `?amendment=99` → 404 `The policy document is not issued yet` → message « pas encore disponible » + Réessayer. Le corps d'erreur blob est donc bien relu à travers axios et l'intercepteur.
- Route de quittance sur la démo actuelle : 404 `Resource not found` (route absente avant la #111) → message générique + Réessayer.

## Vérification contre la démo avec la #111 (2026-09-30, 11:30, lecture seule)
- API : `GET /subscription-amendments?status=APPLIED` → `policyNumber: IA-2026-000002`, `clientName: KONATÉ Yann` ; `GET /subscriptions/402/receipts/Q-0000-000000/document` → 404 `Receipt not found: Q-0000-000000`.
- Navigateur (Playwright, écritures bloquées, aucune partie) : liste « Appliquées » à 360, 390 et 1280 px avec le vrai n° de police et le vrai client, 0 px de débordement ; détail #1 idem ; téléchargement réel de l'avenant n° 1 → `Avenant 1.pdf`, 49 Ko, en-tête `%PDF-` ; route de quittance réelle avec un numéro inconnu → « Quittance introuvable. ».
- **Non vérifié en réel :** le téléchargement d'une vraie quittance — la démo n'en a aucune (il faudrait valider une baisse ou payer une hausse, donc écrire). Couvert par les tests simulés.

## Décisions prises en cours de route
- Détail, `clientName` nul → même rendu que la liste : « Client supprimé » en grisé (en-tête et carte Contrat).
- PDF de quittance, 400 (identifiant mal formé) → message générique **sans** Réessayer.

## Review findings
**Round 2** — 2026-09-30 · base `cd3a0fe` · HEAD `cd3a0fe` + changements non commités · verdict : prêt — R1-1…R1-4 confirmés, chacun avec un test qui échouerait sans le correctif
- ~~**R2-1** ⚪ (suspected) `clientName` absent du détail affiché « Client supprimé » — `src/components/amendments/ClientName.tsx:2`~~ réfuté : `AmendmentDetailResponse` (backend `develop`) est un record sans `@JsonInclude(NON_NULL)`, le champ est donc toujours sérialisé ; il vaut `null` seulement quand le contrat n'a plus de client (`AmendmentValidationService.java:137`), même sens que dans la liste. Rien à changer.

**Round 1** — 2026-09-30 · base `cd3a0fe` · HEAD `cd3a0fe` + changements non commités · verdict : prêt (⚪ seulement)
- [x] **R1-1** ⚪ Client nul dans le détail : « Client supprimé » non grisé dans l'en-tête, « — » dans la carte Contrat — `src/routes/_auth/contrats.modifications_.$amendmentId.tsx:389` (fixed, round 2)
- [x] **R1-2** ⚪ `AmendmentDetail.clientName` rendu obligatoire alors que Postman le dit facultatif (L-002) — `src/lib/amendments.ts:173` (fixed, round 2)
- [x] **R1-3** ⚪ Aucun test ne relie les services de téléchargement à `readBlobErrorBody` — `src/services/amendments.ts:69` (fixed, round 2)
- [x] **R1-4** ⚪ 400 sur le PDF de quittance → « Réessayer » inutile — `src/lib/amendments.ts:655` (fixed, round 2)
