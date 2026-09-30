# Build plan — Avenants MRH dans la file de validation

- **Status:** in-progress
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** —
- **Branch:** `feat/mrh-amendments` · **Worktree:** `.claude/worktrees/mrh-amendments` · **Ports:** app 3004
- **Spec:** ci-dessous · **Étend:** `context/features/contract-amendments/` · **Lessons applied:** L-001, L-002, L-005/L-009, L-011

## Spec

**Demande (utilisateur, 2026-09-30) :** intégrer les avenants MRH (PR backend #119, fusionnée sur `develop`, pas encore déployée) dans la file `/subscription-amendments` (`amendment:read-all`, `amendment:validate`). Implémenté contre le contrat de `origin/develop` en attendant le déploiement.

**Contrat (backend `origin/develop`) :**
- `SubscriptionAmendmentResponse.mrh` (null sur un avenant IA) : `contentsValue`, `buildingValue` (BATIMENT), `monthlyRent` (TENANT), `rooms`, `selectedWarrantyIds`, `productSnapshot` (situation, `rentalRisks`…), `warrantiesSnapshot` (lignes de garantie + accessoire). Champs IA (`insuredPhone`, `beneficiaries`…) nuls sur un avenant MRH.
- `AmendmentDetailResponse.current.mrh` : mêmes champs, conditions en vigueur ; `current.insuredPhone` nul et `current.beneficiaries` vide sur MRH.
- `delta.tax` MRH : écart de taxe garantie par garantie (25 % / 14,5 %) × prorata, + taxe de l'accessoire sur une hausse — peut être de signe opposé à `netDelta` (D13 backend).
- Filtre liste `product` : `IA_FOR_ALL`, `IA_STANDARD`, `MRH_STANDARD`.
- `GET /subscriptions/{id}` : `housing` (type, numéro, pièces, adresse, surface) et `insuredCompany` (raison sociale, téléphone, email, adresse) pour un contrat MRH.
- Erreur « une autre modification en cours » : `errors.subscription = AMENDMENT_IN_PROGRESS`.

**Décisions (défauts) :**
- D-1 Produit MRH Standard ajouté au filtre et aux libellés ; produit d'une modification = `mrh` ⇒ MRH Standard (avant IA).
- D-2 Comparatif MRH : Situation, Contenu, Bâtiment (si présent d'un côté), Loyer mensuel et Risques locatifs (si présents), Nombre de pièces, Garanties (noms des lignes de `warrantiesSnapshot`, triés), Prime annuelle ; pas de téléphone ni de bénéficiaires.
- D-3 Détail MRH : cartes « Logement » et « Souscripteur » (société assurée si le contrat est au nom d'une société, sinon le client) en lecture seule, depuis `GET /subscriptions/{id}`.
- D-4 Écart : quand la taxe est de signe opposé à l'écart net, note « des garanties de taux différents (25 % et 14,5 %) s'échangent ».
- D-5 `AMENDMENT_IN_PROGRESS` traduit ; tout autre refus affiche le `message` du backend.

**Critères d'acceptation :**
- AC-1 Filtre produit avec MRH Standard ; une modification MRH affiche « MRH Standard » dans la liste.
- AC-2 Détail MRH : avant/après (contenu, bâtiment, loyer, pièces, garanties, prime) avec les lignes modifiées surlignées, sans téléphone ni bénéficiaires.
- AC-3 Écart affiché (surprime / ristourne / inchangé), note D-4 quand la taxe est de signe opposé.
- AC-4 Valider (hausse → attente de paiement ; baisse → appliquée) et Supprimer, comme pour IA ; erreurs traduites ou `message`.
- AC-5 PDF d'avenant et de quittance téléchargeables (mêmes routes qu'IA).
- AC-6 Parcours IA inchangé (tests existants verts).

## Steps
- [x] **S1.** Types + produit + comparatif MRH + erreurs (`src/lib/amendments.ts`) — AC-1, AC-2, AC-3, AC-5 — verify: tests unitaires
- [x] **S2.** Détail : comparatif sans bénéficiaires pour MRH, Logement / Souscripteur, note de taxe — AC-2, AC-3 — verify: tests de route
- [x] **S3.** Contrôles + recette (démo si #119 déployée, sinon réponses simulées)

## Review findings

## Acceptance run

> Run: run 1 · 2026-09-30 · HEAD `44154b4` · 6 pass · 0 fail — dev (port 3004) + proxy vers la démo, Playwright. La démo n'a **pas** encore la #119 (aucun champ `mrh`) : parcours MRH sur réponses simulées (contrat `origin/develop`), écritures bloquées ; parcours IA sur la vraie démo.

- AC-1 — pass — `?product=MRH_STANDARD` : ligne « MRH-2026-000001 · KONE Awa · MRH Standard · Hausse · 6 018 FCFA ».
- AC-2 — pass — détail #51 : Situation, Valeur du contenu (modifié), Loyer mensuel, Risques locatifs, Nombre de pièces (modifié), Garanties (modifié), Prime annuelle (modifié) ; pas de bénéficiaires ni de téléphone ; cartes Logement (Appartement, B12, 4 pièces, adresse) et Souscripteur.
- AC-3 — pass — « Prime supplémentaire à payer », taxe −50 FCFA + note des taux 25 % / 14,5 %.
- AC-4 — pass — confirmation « Une quittance de 6 018 FCFA sera envoyée au client… » ; `POST /subscription-amendments/51/validate` émis (intercepté, rien envoyé). Suppression et erreurs : tests simulés.
- AC-5 — tests simulés (mêmes routes que l'IA, vérifiées en réel au lot 2).
- AC-6 — pass — IA réel : liste APPLIED et détail #1 (IA-2026-000002) identiques.
- 0 px de débordement à 1280 et 390 px.
- **À refaire en réel** quand la #119 sera déployée sur la démo : lecture d'un vrai avenant MRH (lecture seule).
