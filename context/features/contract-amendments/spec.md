# Modifications de contrat (avenants IA) — spec

**Status:** done · **Branche :** `feat/contract-amendments` · **Worktree :** `.claude/worktrees/feat-contract-amendments` · **PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/7

## Besoin

File de travail du gestionnaire NSIA pour les modifications de contrats IA (IA Standard, IA Pour Tous) préparées par le client (app client) ou l'agent vendeur (app vendeur). Le back-office **lit, valide et supprime** ; la préparation et le paiement se font ailleurs (l'admin n'a pas `seller:self`).

Validation, selon l'écart de prime (`delta.kind`) :
- `UNCHANGED` (téléphone ou bénéficiaires seulement, ou écart nul) : appliquée tout de suite, avenant PDF produit ;
- `REFUND` : appliquée, quittance de ristourne (`TO_REFUND`, montants négatifs, sans accessoires, remboursée par NSIA hors plateforme) + avenant ;
- `INCREASE` : quittance d'appel de prime (`TO_PAY`), la modification passe `AWAITING_PAYMENT` ; le contrat change au paiement FineoPay (client ou agent).

Référence API : collection Postman « NSIA Connect » (`~/Documents/NSIA Connect.postman_collection.json`, dossier « Commun › Validation des modifications ») — générée depuis l'OpenAPI du backend, elle fait foi pour les formes (L-002).

## Routes

| Action | Route | Permission |
|---|---|---|
| Liste | `GET /subscription-amendments?status=&product=&page=&size=&sort=` → Page | `amendment:read-all` |
| Détail | `GET /subscription-amendments/{id}` → `AmendmentDetail` | `amendment:read-all` |
| Valider | `POST /subscription-amendments/{id}/validate` (sans corps) → 200 `Amendment` (`APPLIED` ou `AWAITING_PAYMENT`) | `amendment:validate` |
| Supprimer | `DELETE /subscription-amendments/{id}` → 204 (idempotent) | `amendment:validate` |
| Fiche contrat | `GET /subscriptions/{subscriptionId}` | `subscription:read-all` |
| PDF | `GET /subscriptions/{subscriptionId}/policy-document?amendment={n}` (absent = le plus récent, 0 = police d'origine) | `subscription:read-all` |

- `status` : `DRAFT` (défaut), `AWAITING_PAYMENT`, `APPLIED`, `DELETED` — pas de « tous » → un onglet par statut.
- `product` : `IA_STANDARD` | `IA_FOR_ALL` (le backend accepte aussi `MRH_STANDARD` → page vide ; non proposé).
- `sort` : `createdAt` ou `updatedAt` uniquement (autre → 400 « Invalid sort property », vérifié sur la démo). Défaut `createdAt,desc`.
- PDF : 404 « The policy document is not issued yet » (PDF pas encore produit, ou avenant sans PDF) → « Réessayer » ; 502 = stockage indisponible.

## Formes

Celles de Postman, avec ces écarts par rapport au brief initial (validés 2026-09-30) :
- **E1** `validatedAt: string|null` existe sur `Amendment`.
- **E2** `RiskClassSnapshot` porte aussi `deathCapital`, `permanentDisabilityCapital`, `medicalExpensesCapital`.
- **E3** Seuls `delta.*` et `receipt.*` sont des francs entiers ; `netPremium`/`fees`/`tax`/`grossPremium` (et ceux de `current`) peuvent avoir des centimes (démo : `256.25`, `37.16`). **Décision : tout montant s'affiche arrondi au franc** avec séparateurs (« 28 688 FCFA »), via le formateur FCFA existant.
- Produit : `formulaSnapshot` non nul ⇒ IA Pour Tous ; `riskClassSnapshot` non nul ⇒ IA Standard.
- `AmendmentDetail` = champs de `Amendment` à plat + `policyNumber`, `clientName` (« NOM Prénom »), `current { formulaSnapshot, riskClassSnapshot, netPremium, fees, tax, totalPremium, insuredPhone, beneficiaries, amendmentNumber }`.

Exemples réels (démo, lecture seule) : `GET /subscription-amendments?status=APPLIED` → 1 élément (id 1, contrat 402, IA-2026-000002, IA Standard, UNCHANGED, amendmentNumber 1).

## Écrans

### Menu
« Contrats › Modifications » (nouveau groupe si « Contrats » n'existe pas). Masqué sans `amendment:read-all` (droit inconnu = refus, L-005).

### Liste « Modifications de contrat »
- Onglets : **À traiter** (`DRAFT`, défaut) · **En attente de paiement** · **Appliquées** · **Supprimées**. Filtre produit (Tous / IA Standard / IA Pour Tous). Onglet, produit, page, tri dans l'URL.
- Colonnes : date de création, n° de contrat (`subscriptionId` — la liste n'a ni n° de police ni client, **pas d'appel au détail par ligne**), produit, type d'écart (badge Hausse / Baisse / Inchangée), montant `delta.total`, statut de la quittance si elle existe (`PAID_NOT_APPLIED` en rouge).
- Tri : date de création ou de mise à jour uniquement.
- Responsive : vue cartes sous 672 px de contenu (règles `ui-registry.md`).

### Détail « Examiner la modification »
- En-tête : n° de police, nom du client, statut, lien vers la fiche du contrat.
- **Comparatif avant / après — seulement pour `DRAFT` et `AWAITING_PAYMENT`** (« Avant » = `current`, « Après » = la modification ; lignes qui changent mises en évidence) :
  - IA Pour Tous : formule (libellé), capitaux, prime annuelle ;
  - IA Standard : classe (n° + libellé), trois capitaux, majorations cochées (`appliedModifiers`), remise, prime annuelle ;
  - téléphone de l'assuré ;
  - bénéficiaires : deux listes côte à côte (nom, lien, part).
- **E7 — `APPLIED` et `DELETED` : seulement l'état demandé**, sans colonne « Avant » (décision 2026-09-30). `current` décrit le contrat d'aujourd'hui, donc déjà modifié pour une modification appliquée : le comparatif serait trompeur. Mention courte expliquant qu'on montre ce que la modification demandait.
- Encadré **Écart à payer ou à rembourser** (`delta`) : date d'effet, jours restants / jours du contrat, écart net, accessoires, taxe, total. Titre selon `kind` : « Prime supplémentaire à payer » / « Ristourne au client » / « Prime inchangée : avenant seul ».
- `tariffChanged === false` → « Changement administratif : la prime ne change pas ».
- `receipt` : n°, type, statut traduit, montants, date d'effet et d'expiration. Pas de téléchargement (aucune route back-office).
- PDF : si `amendmentNumber` non nul, lien « Avenant n° N » → `policy-document?amendment=N` ; 404 → message + « Réessayer ».

### Actions (masquées sans `amendment:validate`)
- **Valider** (`DRAFT` seulement) : confirmation annonçant l'issue d'après `delta.kind` :
  - UNCHANGED : « L'avenant sera appliqué immédiatement. »
  - REFUND : « L'avenant sera appliqué et une ristourne de X FCFA sera à rembourser au client. »
  - INCREASE : « Une quittance de X FCFA sera envoyée au client. Le contrat changera après son paiement. »
  - + « Le montant est recalculé à la date du jour : seul le nombre de jours restants change, pas la prime annuelle. » Après validation, afficher le résultat de la **réponse** (qui fait foi pour le montant).
- **Supprimer** (`DRAFT` ou `AWAITING_PAYMENT`) : confirmation ; pour `AWAITING_PAYMENT`, prévenir que la quittance sera annulée et que le client ne pourra plus payer.
- Après chaque action : invalider détail + liste.
- 422 `AMENDMENT_NOT_DRAFT` (double validation) : « Cette modification a déjà été traitée. » et recharger le détail.

### Erreurs traduites
| Cas | Message |
|---|---|
| `errors.status = AMENDMENT_NOT_DRAFT` | Cette modification a déjà été traitée. |
| `errors.status = SUBSCRIPTION_NOT_AMENDABLE` | Le contrat ne peut plus être modifié (inactif, échu ou résilié). |
| `errors.status = AMENDMENT_ALREADY_APPLIED` | Modification déjà appliquée : suppression impossible. |
| 404 | Modification introuvable. |
| 403 | Vous n'avez pas le droit d'effectuer cette action. |

### Libellés
- Modification : `DRAFT` À traiter · `AWAITING_PAYMENT` En attente de paiement · `APPLIED` Appliquée · `DELETED` Supprimée.
- Quittance : `TO_PAY` À payer · `PAID` Payée · `TO_REFUND` À rembourser · `CANCELLED` Annulée · `PAID_NOT_APPLIED` Payée après suppression, à traiter par NSIA (rouge).
- Lien bénéficiaire : `SELF` Assuré lui-même · `SPOUSE` Conjoint · `CHILD` Enfant · `PARENT` Parent · `SIBLING` Frère/sœur · `OTHER` Autre.

## Tests (décision 2026-09-30)
La démo est partagée et en lecture seule, sans modification à traiter → **tests vitest sur réponses simulées** (calquées sur les réponses réelles) pour : validation UNCHANGED (appliquée), REFUND (ristourne), INCREASE (attente de paiement), suppression d'une `AWAITING_PAYMENT` (quittance annulée), 422 double validation. Plus une vérification **en lecture seule** contre la démo : liste par statut, détail, 404, tri refusé, PDF.

## Hors périmètre
Création/édition de modification, paiement, marquage « remboursée » d'une ristourne, MRH.

## Demandes backend

Les trois sont en cours côté backend (confirmé le 2026-09-30). Quand elles arrivent : télécharger la quittance depuis le détail, afficher n° de police et client dans la liste, et rétablir le comparatif avant / après sur les onglets Appliquées et Supprimées.
1. Route back-office de téléchargement du PDF de la quittance (déposé dans les documents du client).
2. `policyNumber` et `clientName` dans la liste `/subscription-amendments`.
3. Copie de l'état du contrat **avant** la modification (pour un comparatif juste sur l'historique).
