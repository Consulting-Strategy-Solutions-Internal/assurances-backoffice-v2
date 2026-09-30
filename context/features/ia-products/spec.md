# Produits IA — spécification consolidée (back-office)

Source : brief utilisateur (2026-09-29) corrigé par la collection Postman « NSIA Connect » et le code backend
(`assurances-backend-v2`, branche des routes `/ia-standard`). En cas de doute, **ce fichier fait foi**.

## Décisions validées par l'utilisateur

- L'ancien paramétrage IA est **supprimé entièrement** : `src/services/ia-pricing.ts`, `src/components/ia-pricing/`, le bloc IA de `products_.$productId.tsx`, la simulation de cotation IA (`IaSimulationForm`, `src/lib/premium/ia*`, onglet IA de `cotations_.simulation.tsx`), l'ancienne page `/products/accessoires` et `src/components/accessories/`. La simulation MRH doit continuer de compiler (elle lit les accessoires → adapter à `product=MRH_STANDARD`).
- Import CSV : le front **bloque avant envoi** tout fichier dont une ligne n'a pas le `productCode` NSIA d'IA Standard (lu via le produit, écran 4) ; lister les lignes fautives.
- Auth : on garde le client `src/lib/api.ts` existant (cookies HttpOnly + refresh), pas de Bearer à la main.
- Postman a des exemples périmés (majorations `PERCENTAGE` + `riskClassId`, statuts 200 sur POST/DELETE accessoires/prorata) : **on ne les suit pas**.
- `commissionRate` : jamais affiché, **renvoyé tel que relu** dans chaque PUT /products (décision utilisateur 2026-09-29).

## Règles générales

- Base `VITE_API_URL` (inclut `/api`). Aucun `productId` sur les routes IA.
- Page : `PageResponse<T> { content, page, size, totalElements, totalPages, last }`, params `page` (0), `size`, `sort=champ,asc|desc`.
- `ErrorResponse { status, message, timestamp, errors?: Record<string,string> }` sauf import CSV. `errors[champ]` = message (anglais, Jakarta : « must not be null »…) **ou** code stable. Afficher sous le champ : code stable → traduction FR ; message Jakarta → message FR propre au front (validation front identique, donc rare) ; sans champ → `message`.
- 400 sans `errors` possibles (tri invalide, corps malformé, recherche < 2 car.) → afficher `message`. 409 sans `errors` (course concurrente) → message générique « Cet élément existe déjà. ».
- Suppressions douces, 204, toujours derrière `ConfirmDialog`.
- Permissions : actions d'écriture **désactivées** avec tooltip (convention du repo, `usePermissions().can`).
- Nombres envoyés tels quels (pas d'arrondi). Dates `LocalDateTime` ISO sans fuseau → `formatDate`.

## Traduction des codes stables

| Code                                  | HTTP | clé errors                                  | FR                                                                            |
| ------------------------------------- | ---- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| RISK_CLASS_NUMBER_ALREADY_EXISTS      | 409  | classNumber                                 | Ce numéro de classe existe déjà.                                              |
| RISK_CLASS_NUMBER_LOCKED              | 422  | classNumber                                 | Numéro non modifiable : un contrat utilise déjà cette classe.                 |
| RISK_CLASS_HAS_PREMIUM_RATE           | 422  | premiumRates                                | Supprimez d'abord le barème de cette classe.                                  |
| RISK_CLASS_HAS_ACTIVE_CONTRACT        | 422  | subscriptions                               | Des contrats en cours utilisent cette classe : suppression impossible.        |
| OCCUPATION_HAS_ACTIVE_CONTRACT        | 422  | subscriptions                               | Des contrats en cours utilisent ce métier : suppression impossible.           |
| RISK_CLASS_INACTIVE                   | 422  | riskClassId                                 | La classe choisie est inactive.                                               |
| RISK_CLASS_NOT_FOUND                  | 422  | riskClassId                                 | La classe choisie n'existe plus.                                              |
| OCCUPATION_DESCRIPTION_ALREADY_EXISTS | 409  | description ou `occupations[i].description` | Ce métier existe déjà (peut-être dans une autre classe).                      |
| PREMIUM_RATE_ALREADY_EXISTS           | 409  | riskClassId                                 | Cette classe a déjà un barème.                                                |
| PREMIUM_MODIFIER_CODE_ALREADY_EXISTS  | 409  | code                                        | Ce code est déjà utilisé.                                                     |
| FORMULA_LABEL_ALREADY_EXISTS          | 409  | label                                       | Une formule porte déjà ce nom.                                                |
| FORMULA_IN_USE                        | 422  | formulaId                                   | Formule déjà utilisée dans un devis : désactivez-la et créez-en une nouvelle. |
| FORMULA_INACTIVE                      | 422  | formulaId                                   | Cette formule est inactive.                                                   |
| AGE_SURCHARGE_NOT_APPLICABLE          | 422  | ageSurchargeRate                            | La majoration d'âge ne s'applique qu'à IA Standard.                           |
| (clé) premiumRangeValid               | 400  | premiumRangeValid                           | Le maximum doit être supérieur ou égal au minimum.                            |
| (clé) monthRangeValid                 | 400  | monthRangeValid                             | La durée maximale doit être supérieure ou égale à la durée minimale.          |
| (clé) ageSurchargeBandValid           | 400  | ageSurchargeBandValid                       | L'âge minimum doit être inférieur ou égal à l'âge maximum.                    |

Les suppressions de classe peuvent renvoyer `premiumRates` ET `subscriptions` ensemble : tout afficher.
Les clés croisées (`premiumRangeValid`…) s'affichent sous le champ « max » concerné.

## Écran 1 — Classes & métiers (`riskclass:read` / `riskclass:write`)

Types : `RiskClass { id, classNumber, description, active, occupationCount, createdAt, updatedAt }`,
`RiskClassDetail = RiskClass & { occupations: Occupation[] }` (tous les métiers, actifs ou non),
`Occupation { id, riskClassId, description, active }`,
`OccupationDetail { id, description, active, riskClass: { id, classNumber, description } }`,
`OccupationSearchResult { id, description, classNumber, riskClassId }`.
| Action | Route | Corps / réponse |
|---|---|---|
| Lister | GET /ia-standard/risk-classes?status=ACTIVE\|INACTIVE\|ALL&page&size&sort | défaut ACTIVE, tri classNumber → Page<RiskClass> (filtre status ignoré sans riskclass:write) |
| Détail | GET /ia-standard/risk-classes/{id} | RiskClassDetail |
| Créer | POST /ia-standard/risk-classes | `{ classNumber: int ≥1 requis, description: requis non vide ≤255, active?: bool (défaut true), occupations?: [{ description requis ≤255, active? }] }` → 201 RiskClassDetail |
| Modifier | PUT /ia-standard/risk-classes/{id} | `{ classNumber, description }` (mêmes règles) → 200 RiskClassDetail |
| Statut | PATCH /ia-standard/risk-classes/{id}/status | `{ active: bool requis }` → RiskClassDetail |
| Supprimer | DELETE /ia-standard/risk-classes/{id} | 204 (supprime ses métiers) |
| Ajouter métier | POST /ia-standard/risk-classes/{riskClassId}/occupations | `{ description requis ≤255, active? }` → 201 Occupation |
| Détail métier | GET /ia-standard/occupations/{id} | OccupationDetail |
| Renommer / reclasser | PUT /ia-standard/occupations/{id} | `{ description requis ≤255, riskClassId? }` → Occupation |
| Statut métier | PATCH /ia-standard/occupations/{id}/status | `{ active: bool requis }` → Occupation |
| Supprimer métier | DELETE /ia-standard/occupations/{id} | 204 |
| Rechercher | GET /ia-standard/occupations/search?q&page&size | q ≥ 2 car., size ≤ 100 → Page<OccupationSearchResult> |
Comportements : numéro verrouillé dès qu'un contrat existe (422), description toujours modifiable ; désactiver une classe ne touche pas ses métiers ; libellé métier unique sur toutes les classes (casse/accents/espaces ignorés) ; ajout de métier seulement dans une classe active (désactiver le bouton si inactive) ; reclassement : ne proposer **que les classes actives**. Filtre de liste ACTIVE/INACTIVE/ALL.

## Écran 2 — Barèmes (`riskclasspremiumrate:read` / `:write`)

`PremiumRate { id, riskClassId, death, permanentDisability, medicalExpenses, createdAt, updatedAt }` — taux en **‰**.
Chaque taux : requis, **0,01 ≤ x ≤ 100, ≤ 2 décimales** (0 refusé).
| Lister | GET /ia-standard/risk-class-premium-rates?page&size&sort (pas de filtre classe) |
| Par classe | GET /ia-standard/risk-class-premium-rates/by-risk-class/{riskClassId} (404 si aucun) |
| Détail | GET /ia-standard/risk-class-premium-rates/{id} |
| Créer | POST … `{ riskClassId, death, permanentDisability, medicalExpenses }` → 201 |
| Modifier | PUT …/{id} `{ death, permanentDisability, medicalExpenses }` (classe inchangée) |
| Supprimer | DELETE …/{id} → 204 |
UX : tableau une ligne par classe (croiser la liste des classes `status=ALL` avec la liste des barèmes chargée entièrement, size 200), 3 taux ; sans barème → badge « Non cotable » + bouton « Définir le barème ».

## Écran 3 — Majorations & réductions (`premiummodifier:read` / `:write`)

`PremiumModifier { id, code, label, modifierType: 'SURCHARGE'|'DISCOUNT', rate, triggerType: 'MANUAL', isActive, createdAt, updatedAt }`.
Routes : GET /ia-standard/premium-modifiers (page, tri défaut code, actives+inactives) ; GET/{id} ; POST → 201 ; PUT/{id} (remplace tout) ; DELETE/{id}.
Corps : `{ code requis ≤255, label requis ≤255, modifierType requis, rate requis (0,01–100 %, ≤2 déc.), triggerType: 'MANUAL' (toujours envoyé, jamais affiché), isActive }`.
Code (règle front, demande utilisateur 2026-09-30) : 3–50 caractères, majuscules/chiffres, un seul « _ » entre les mots, commence par une lettre (`^[A-Z][A-Z0-9]\*(?:_[A-Z0-9]+)\*$`) ; saisie normalisée (accents retirés, espaces/tirets → « \_ »), proposé d'après le libellé en création, aide affichée sous le champ ; un code existant non conforme reste accepté s'il n'est pas modifié. Code stocké trim + majuscules ; unique sans casse (409). isActive coché par défaut. SURCHARGE = +taux, DISCOUNT = −taux (afficher « +5 % » / « −5 % »). Info : les devis existants gardent leur copie.

## Écran 4 — Réglages IA Standard (`product:read` / `product:write`)

`Product { id, label, productCode: int, code: 'IA_STANDARD'|'IA_FOR_ALL'|'MRH_STANDARD', insuranceType: 'IA'|'MRH', discountEnabled, maxDiscountRate, commissionRate, ageSurchargeMinAge, ageSurchargeMaxAge, ageSurchargeRate, createdAt, updatedAt }`.

- Trouver via GET /products?insuranceType=IA (page, size 50) puis `code === 'IA_STANDARD'`. **Jamais d'id en dur.**
- PUT /products/{id} = remplacement complet : recharger le produit, renvoyer `label`, `productCode` (requis), `discountEnabled`, `maxDiscountRate` + champs édités. Un champ omis est effacé (discountEnabled null → false).
- Éditables : `ageSurchargeMinAge`, `ageSurchargeMaxAge` (requis, entiers 0–65, min ≤ max), `ageSurchargeRate` (requis, 0–100 %, ≤ 2 déc. ; 0 = désactivée), `discountEnabled` (bool), `maxDiscountRate` (optionnel, 0–100 %, vide = pas de plafond).
- `commissionRate` : jamais affiché, **renvoyé tel que relu** (sinon le backend l'efface).

## Écran 5 — Formules IA Pour Tous (`product:read` / `product:write`)

`Formula { id, label, displayOrder: int|null, status: 'ACTIVE'|'INACTIVE', deathCapital, permanentDisabilityCapital, medicalExpenses, dailyAllowance, netPremium, fees, tax, grossPremium, createdAt, updatedAt }`.
| Lister | GET /ia-for-all/formulas → **tableau** (pas de page), trié displayOrder puis id |
| Détail | GET /ia-for-all/formulas/{formulaId} |
| Créer | POST → 201 (ACTIVE) |
| Modifier | PUT /{formulaId} (remplacement complet, statut inchangé ; displayOrder absent = effacé → toujours renvoyer la valeur du formulaire) |
| Désactiver / activer | PATCH /{formulaId}/deactivate · /activate (sans corps) |
Corps : `{ label requis ≤255, displayOrder?: int, deathCapital, permanentDisabilityCapital, medicalExpenses, dailyAllowance, netPremium, fees, tax, grossPremium }` — 8 montants requis, **≥ 0, ≤ 2 décimales**.
Avertissement non bloquant si `netPremium + fees + tax ≠ grossPremium`. 422 FORMULA_IN_USE → message + actions « Désactiver » et « Créer une nouvelle formule ». Libellé unique (409). Statut visible + bascule. Montants en FCFA (`formatFcfa`).

## Écran 6 — Accessoires IA Standard (`accessory:read` / `accessory:write`)

`Accessory { id, product, minPremium, maxPremium, amount, createdAt, updatedAt }`.
Toujours `?product=IA_STANDARD` en liste et `"product": "IA_STANDARD"` dans les corps ; pas de sélecteur.
| Lister | GET /accessories?product=IA_STANDARD&page&size&sort (défaut minPremium) — charger tout (size 200) pour les contrôles |
| Détail | GET /accessories/{id} |
| Créer | POST /accessories `{ product, minPremium, maxPremium, amount }` → 201 |
| Modifier | PUT /accessories/{id} (même corps) |
| Supprimer | DELETE /accessories/{id} → 204 |
| Import | POST /accessories/import multipart, partie `file` |
Règles : 3 montants requis ≥ 0, max ≥ min (400 premiumRangeValid). Avertissement non bloquant si deux tranches se chevauchent ou s'il existe un trou entre tranches consécutives (triées par min).
CSV : en-tête `productCode,minPremium,maxPremium,amount` (casse/espaces ignorés), séparateur `,` ou `;` (détecté sur l'en-tête), décimaux `,` ou `.`, lignes vides ignorées. Pré-contrôle front bloquant : chaque ligne doit avoir `productCode === product.productCode` d'IA Standard (lignes fautives listées, numéro de ligne avec en-tête = 1). Succès 201 `{ imported, errors: [] }` → toast « N tranches importées ». Rejet 422 `{ imported: 0, errors: [{ line, message }] }` (pas un ErrorResponse ; line 0 = fichier entier ; messages serveur en anglais affichés tels quels) → liste des lignes. 400 ErrorResponse si pas de fichier. Rien n'est importé en cas de rejet (tout ou rien).

## Écran 7 — Prorata court terme (`prorationcoefficient:read` / `:write`)

`Proration { id, product, minMonths, maxMonths: int|null, coefficient, createdAt, updatedAt }`.
Toujours `?product=IA_STANDARD` / `"product": "IA_STANDARD"`.
Routes : GET /proration-coefficients?product=IA_STANDARD (défaut minMonths) ; GET/{id} ; POST `{ product, minMonths, maxMonths?, coefficient }` → 201 ; PUT/{id} ; DELETE/{id} → 204.
Règles : minMonths requis entier ≥ 1 ; maxMonths optionnel entier ≥ 1 et ≥ minMonths (400 monthRangeValid), null = « et au-delà » → afficher « ∞ », case « Sans limite » ; coefficient requis 0–1, afficher aussi en % (0,80 → 80 %).
Liste vide → le backend applique la grille par défaut 1–3 → 0,60 ; 4–6 → 0,80 ; 7–9 → 0,90 ; 10+ → 1,00 (constante front). Afficher cette grille (libellée « Grille par défaut appliquée ») + bouton « Personnaliser la grille » qui crée ces 4 tranches pré-remplies (après confirmation, POST séquentiels). Dès qu'une tranche existe, la grille par défaut ne s'applique plus : le dire.
Avertissement non bloquant si chevauchement ou si une durée de 1 à 12 mois n'est couverte par aucune tranche (« la cotation échouera pour N mois »).

## Navigation

Sidebar : dans le groupe « Produits », un sous-groupe repliable « Individuel Accidents » avec deux enfants (demande utilisateur 2026-09-30) :

- « IA Standard » → `/produits-ia/ia-standard` : layout à onglets **dans l'URL** (routes enfants) : `classes` (défaut, redirection), `baremes`, `majorations`, `accessoires`, `prorata`, `reglages`.
- « IA Pour Tous » → `/produits-ia/ia-pour-tous` (écran Formules).
  Retirer « Accessoires » du groupe « Produits » (page supprimée).

## Hors périmètre

Cotation, souscription, types de sinistre, schémas de commission.
