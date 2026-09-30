# Modifications de contrat, lot 2 — n° de police, client et PDF de quittance

**Status:** done · **Branche :** `feat/amendment-receipts` · **Worktree :** `.claude/worktrees/feat-amendment-receipts` · **PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/8
**Suite de :** `context/features/contract-amendments/` (PR #7, en production)

## Blocage
La PR backend #111 (`feat/amendment-backoffice-reads` → `develop`) apporte les deux lectures nécessaires. Au 2026-09-30 elle est **ouverte**, et la démo ne l'inclut pas : la liste n'a ni `policyNumber` ni `clientName`, et `GET /subscriptions/{id}/receipts/{n}/document` répond 404 « Resource not found ». **Décision (2026-09-30) : on attend que la #111 soit fusionnée et déployée sur la démo avant de coder.**

**Mise à jour (2026-09-30, 10:44) :** la #111 est fusionnée dans `develop` (`89c4278`) ; le contrat est figé. La démo ne l'a pas encore : le backend ne se publie que depuis `main` (CI → image `main-<sha>`) et se déploie à la main (`deploy.yml`, `workflow_dispatch`). **Décision : coder maintenant**, tests sur réponses simulées ; vérification en lecture seule contre la démo dès qu'elle a la #111, **avant** de proposer la PR.

Pour reprendre :
1. `gh pr view 111 -R Consulting-Strategy-Solutions-Internal/assurances-backend-v2` → `MERGED` ;
2. sur la démo, `GET /subscription-amendments?status=APPLIED` renvoie `policyNumber` et `clientName` ;
3. `GET /subscriptions/402/receipts/Q-0000-000000/document` → 404 `Receipt not found: Q-0000-000000` (et plus « Resource not found ») ;
4. Postman : lu en ligne le 2026-09-30 (collection « NSIA Connect », workspace XGS) — « Télécharger le PDF d'une quittance » (`22a7c48b…`) et « Lister les modifications à traiter » (`730834ea…`) sont à jour et concordent avec le code de la #111. L'export de `~/Documents` (29/09) est périmé.

## Ce que la #111 ajoute (lu dans son code, qui génère Postman)
- `GET /subscription-amendments` : chaque ligne = la modification à plat + `policyNumber` + `clientName` (« NOM Prénom », `null` si le compte client est supprimé). Les listes client et vendeur ne changent pas.
- `GET /subscriptions/{id}/receipts/{receiptNumber}/document` : PDF en pièce jointe « Quittance Q-….pdf », droits `seller:self` / `subscription:read-all` / `subscription:read-agency` (le client reçoit 403).
  - 404 `Subscription not found with id: …` → « Contrat introuvable » ;
  - 404 `Receipt not found: {n}` → « Quittance introuvable » ;
  - 404 `The receipt document is not issued yet` → « Quittance en cours de production, réessayez dans quelques minutes » + Réessayer ;
  - 403 → « Accès refusé » ; 502 → « Service de documents indisponible, réessayez ».
- Quittance téléchargeable : `REFUND`/`TO_REFUND` (dès la validation) et `SUPPLEMENTARY_CALL`/`PAID` (après paiement). Pas de PDF : `TO_PAY` (« PDF disponible après le paiement »), `CANCELLED`, `PAID_NOT_APPLIED`. `RENEWAL` n'existe jamais sur une modification.

## Écarts brief ↔ PR #111 / Postman (relevés le 2026-09-30)
- ~~**E1** `policyNumber` nullable~~ — Postman (qui fait foi) le type `string` : on le type `string` (L-002).
- **E2** Montants : le brief les dit entiers ; les primes annuelles ont des centimes → on garde l'arrondi au franc (décision du lot 1).
- **E3** Comparatif avant / après : le brief ne le limite plus par statut, mais `current` reste le contrat d'aujourd'hui (la #111 n'ajoute pas l'état d'avant) → on garde : comparatif seulement pour `DRAFT` / `AWAITING_PAYMENT` (décision E7 du lot 1).
- **E4** Boutons sans `amendment:validate` : masqués quand l'absence est connue ; visibles quand les droits sont inconnus (403 traduit) — décision du lot 1, L-005.
- **E5** « Fiche du contrat » : pas de page contrat au back-office → lien vers la fiche client (lot 1).

## À faire (quand la #111 est déployée)
- Liste : colonnes N° de police et Client (« Client supprimé » en grisé si `null`), sans appel au détail ; icône PDF facultative sur les lignes dont la quittance est téléchargeable.
- Détail : bouton « Télécharger la quittance » selon la règle ci-dessus, ou « PDF disponible après le paiement ».
- Erreurs PDF (police, avenant et quittance) : lire le `message` du JSON d'erreur même en réponse blob, ne plus déduire la cause du seul statut (aujourd'hui tout 404 = « pas encore produit »).
- Tests (simulés, calqués sur les vraies réponses) : ristourne téléchargée ; hausse sans bouton puis quittance téléchargeable après paiement ; n° de police et client corrects sur chaque ligne ; chaque 404 avec son message ; plus les cas du lot 1. Puis vérification en lecture seule contre la démo.

## Hors périmètre
Création, édition, paiement d'une modification ; marquage « remboursée » d'une ristourne ; MRH ; état du contrat avant la modification (toujours demandé au backend).
