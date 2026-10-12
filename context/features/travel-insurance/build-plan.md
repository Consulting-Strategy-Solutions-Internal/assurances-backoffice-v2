# Build plan — Assurance Voyage (EVO) au back-office

- **Status:** done
- **Created:** 2026-10-12 · **Updated:** 2026-10-12
- **PR:** —
- **Branch:** `feat/travel-insurance` · **Worktree:** `.claude/worktrees/travel-insurance` · **Ports:** app 3001
- **Depends on:** —
- **Spec:** [spec.md](spec.md) · **Brief:** [brief.md](brief.md) · **ADRs:** — · **Lessons applied:** L-002 (types lus dans le backend), L-004 (cache avant toast), L-005 (masquer = `canKnown`, action gardée = `can`), L-006 (compteur), L-007/L-008 (colonnes mesurées), L-009 (droits `null` et absents testés), L-010, L-011 (motif 400, policyId 100, numéro 30), L-012 (filtres URL), L-013 (état local par id)

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
- **D-12** Retour de la page contrat : `?from=voyage` (+ filtres) → supervision ; sinon fiche client. Les trois alertes voyage ouvrent le contrat avec ce retour vers la supervision filtrée (TO_RECONCILE → `TO_RECONCILE`, REJECTED → `REJECTED`, CERTIFICATE_MISSING → `ISSUED`). — defaulted (précisé en revue R1)
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
- [x] **S3.** Page contrat `/contrats/$subscriptionId` reprenant le tiroir ; fiche client → page ; `?contract=` redirige ; suppression de `ContractDrawer` (tests portés) — files: `src/routes/_auth/contrats.$subscriptionId.tsx`, `src/components/contracts/*`, `clients_.$clientId.tsx` — satisfies: AC-1, AC-12 (D-12) — verify: `src/routes/-contract-detail.test.tsx`, tests portés, `-clients-api.test.tsx`
- [x] **S4.** Bloc voyage + actualisation EVO + attestation — files: `src/components/contracts/TravelSections.tsx` — satisfies: AC-2, AC-3, AC-4, AC-14 — verify: tests de composant
- [x] **S5.** Encadré Décision + 3 dialogues — files: `src/components/contracts/TravelDecisionPanel.tsx`, dialogues — satisfies: AC-6…AC-10 — verify: tests (droit `null` / connu absent / présent, avant / après `reconcilableFrom`, chaque 422)
- [x] **S6.** Liste `/contrats/voyage` — files: `src/routes/_auth/contrats.voyage.tsx` — satisfies: AC-5 — verify: `src/routes/-travel-supervision.test.tsx`
- [x] **S7.** Menu + Ctrl+K + ui-registry — files: `Sidebar.tsx`, `src/components/search/*`, `context/project/ui-registry.md` — satisfies: AC-13 — verify: test Sidebar
- [x] **S8.** `notificationTarget` + NotificationsMenu — files: `src/lib/notifications.ts`, `NotificationsMenu.tsx` — satisfies: AC-11 — verify: `src/lib/notifications.test.ts`
- [x] **S9.** _(fait avant S8 : les liens des notifications visent cette route, que le routeur typé exige existante)_ Page `/remboursements/$refundId` — files: `src/routes/_auth/remboursements_.$refundId.tsx`, `src/components/refunds/*` — satisfies: AC-12 — verify: `src/routes/-refund-detail.test.tsx`
- [x] **S10.** Contrôles complets + `generate-routes` — verify: `npx tsc --noEmit && pnpm lint && pnpm test`

## AC → tests

- AC-1 `src/routes/-contract-detail.test.tsx` (reprise du panneau, états 404/403/500, en-tête), `-contract-detail-api.test.tsx`, `-clients-api.test.tsx` (clic → page, `?contract=` redirigé)
- AC-2…AC-4 `-contract-detail.test.tsx` « Contrat voyage »
- AC-5 `src/routes/-travel-supervision.test.tsx` (filtre, page, jamais de `sort`, compteur, 404 offre coupée, 403, vide), `src/services/travel.test.ts`
- AC-6…AC-10 `src/components/contracts/TravelDecisionPanel.test.tsx` (droit `null` / connu absent / présent, avant / après `reconcilableFrom`, plafond de renvois, chaque 422, 502, 403, confirmation du refus) + `src/lib/travel.test.ts` (`decisionState`, `mapTravelDecisionError`)
- AC-11 `src/lib/notifications.test.ts`, `src/components/notifications/NotificationsMenu.test.tsx`
- AC-12 `src/routes/-refund-detail.test.tsx`, `src/lib/refunds.test.ts` (normalisation identique au backend, préfixe / opérateur, erreurs, alerte)
- AC-13 `src/components/dashboard/sidebar-contrats.test.ts`, `src/components/search/search-logic.test.ts`
- AC-14 couvert par les assertions de dates / montants des tests ci-dessus (`formatClaimDate`, `formatFcfa`, `parseAbidjanDateTime`)

## Review findings

> Last review: round 1 · 2026-10-12 · base `2788363` · HEAD `283e63b` (+ uncommitted: no) · 2 relecteurs (contrat/supervision ; remboursements/notifications) · verdict : prêt après les 🟡

- [x] **R1-1** 🟡 colonne « Client » de la supervision en texte, pas en lien (AC-5, D-8) — `src/routes/_auth/contrats.voyage.tsx:64` (fix: d158bf9) (fixed, round 2)
- [x] **R1-2** 🟡 page remboursement : l'état du formulaire (saisie, bandeau « enregistré ») survit au changement de `refundId` (pas de remontage) ; une saisie pour RF-12 peut partir vers RF-13 — `src/routes/_auth/remboursements_.$refundId.tsx:169` (fix: d158bf9) (fixed, round 2)
- [x] **R1-3** ⚪ `ContractGate` sans test des cas `null` / connu absent (L-009) — `src/components/contracts/ContractGate.tsx:12` (fix: d158bf9) (fixed, round 2)
- [x] **R1-4** ⚪ police inconnue au rattachement : le backend répond 500 → message générique au lieu de « vérifiez l'identifiant » — `src/lib/travel.ts:246` (fix: d158bf9) (fixed, round 2)
- [x] **R1-5** ⚪ après une décision, la liste des contrats de la fiche client (`['subscriptions','all']`) n'est pas invalidée — `src/components/contracts/TravelDecisionPanel.tsx:51` (fix: d158bf9) (fixed, round 2)
- [x] **R1-6** ⚪ clé morte `subscriptionsKeys.evoRefresh` — `src/services/subscriptions.ts:128` (fix: d158bf9) (fixed, round 2)
- ~~**R1-7**~~ mesuré en verify run 1 → défaut confirmé, suivi en **V1-1**
- [x] **R1-8** ⚪ tests portés gardant les anciens numéros d'AC du tiroir (`renderDrawer`, « AC-5 ») — `src/routes/-contract-detail.test.tsx` (fix: d158bf9) (fixed, round 2)
- [x] **R1-9** ⚪ redirection `?contract=` rendue seulement après chargement du client (client supprimé/403 → pas de redirection) — `src/routes/_auth/clients_.$clientId.tsx:241` (fix: d158bf9) (fixed, round 2)
- [x] **R1-10** ⚪ page remboursement sans `BackLink` ; garde « Droit insuffisant » et id invalide non testés — `src/routes/_auth/remboursements_.$refundId.tsx:265` (fix: d158bf9) (fixed, round 2)
- Plan gaps : (a) les alertes voyage ouvrent le contrat avec retour vers la supervision filtrée (`notificationTarget`) — à consigner dans D-12 ; (b) garde de page sur `/remboursements/{id}` (droits `withdrawal:*` connus absents) non prévue par AC-12 ; (c) police inconnue = 500 (R1-4) non prévue par AC-7 ; (d) chemins réels `contrats.$subscriptionId.tsx`, `TravelSections.tsx` vs plan.
- Lesson recurred : L-009 (R1-3).

> Last review: round 2 · 2026-10-12 · re-review `283e63b` → `d158bf9` · R1-1…6, 8…10 confirmés · verdict : prêt (0 🔴, 0 🟡)

> Last review: round 3 · 2026-10-12 · re-review `aca70cf` → `59ce471` (V1-1) · V1-1 confirmé au niveau du code (mesure : verify) · verdict : prêt (0 🔴, 0 🟡)

- [x] **R3-1** ⚪ squelette de chargement sans `hideBelow` : 7 cellules sous un en-tête de 5–6 colonnes — `src/routes/_auth/contrats.voyage.tsx:258` (fix: 8657a9f) (fixed, round 4)
- [x] **R3-2** ⚪ seuil `xl` de « Dernier envoi » peut-être plus prudent que la mesure (à 1280 la colonne est masquée alors que ≈ 888 px tiendraient dans 954) — `src/routes/_auth/contrats.voyage.tsx:251` (fix: 8657a9f) (fixed, round 4)
- [x] **R3-3** ⚪ heure du dernier envoi découpée dans la chaîne brute (`value.slice(11, 16)`) au lieu d'un formateur — `src/routes/_auth/contrats.voyage.tsx:99` (fix: 8657a9f) (fixed, round 4)
- [x] **R3-4** ⚪ seuils `hideBelow` de Client / Dernier envoi non testés — `src/routes/-travel-supervision.test.tsx:268` (fix: 8657a9f) (fixed, round 4)
> Last review: round 4 · 2026-10-12 · re-review `8b796a6` → `8657a9f` · R2-2, R2-3, R3-1…R3-4 confirmés · verdict : prêt (0 🔴, 0 🟡)

- [x] **R4-1** ⚪ seuil `lg` non mesuré au bas de sa plage (896 px de contenu) — mesuré : 896/896 px à 1222 de viewport avec une ligne « À partir du … », 904/904 à 1230, 924/924 à 1250 (verify run 3)
- [~] **R4-2** ⚪ assertion vide `queryByText('T09:0')` dans le test d'intégration de l'heure — `src/routes/-travel-supervision.test.tsx:340` (fix: 2753ba1, test seul, non re-relu)
- [~] **R4-3** ⚪ R3-4 ne vérifiait pas la cellule « Dernier envoi » — `src/routes/-travel-supervision.test.tsx:308` (fix: 2753ba1, test seul, non re-relu)
- [ ] **R2-1** ⚪ lien client dans une ligne `role="button"` (ARIA nested-interactive) — non corrigé : à trancher par un passage axe (recette manuelle M-4, reportée) — `src/routes/_auth/contrats.voyage.tsx:72`
- [x] **R2-2** ⚪ `stopPropagation` au clavier (Entrée sur le lien client) non testé — `src/routes/-travel-supervision.test.tsx:228` (fix: 8657a9f) (fixed, round 4)
- [x] **V1-1** 🟡 table de supervision plus large que l'écran à toutes les largeurs bureau : largeur naturelle 1 322 px (Contrat 164, Client 94, État 138, Envois 71, Dernier envoi 137, Couverture 199, Décision 207, Dernière erreur 276) pour 698 px visibles à 1024, 954 à 1280, 1 114 à 1440 → défilement horizontal ; seuils `hideBelow` à recalculer et colonnes à resserrer (L-008) — S-2 / AC-5 (fix: 59ce471 — mesuré après correctif : 698/698 px à 1024, 826/826 à 1152, 954/954 à 1280, 1114/1114 à 1440) (fixed, run 2)
- [x] **R2-3** ⚪ test « la page propose un retour » ne vérifie pas la cible (`/dashboard`) — `src/routes/-refund-detail.test.tsx:287` (fix: 8657a9f) (fixed, round 4)

## Acceptance run

> Run: run 3 · 2026-10-12 · HEAD `2753ba1` (+ uncommitted: no) · parcours simulé complet rejoué (`verify/mock.mjs`) : 0 fail · 4 manual (1 confirmed, 3 deferred)
> - Après R3-2 (`lg`) : table 698/698 px à 1024, 826/826 à 1152, 890/890 à 1216 (sans Client ni Dernier envoi), 896/896 à 1222 (les 6 colonnes, ligne « À partir du … »), 954/954 à 1280, 1114/1114 à 1440 ; 0 px de débordement à 360/390, avec et sans JavaScript.

> Run 2 (historique) · 2026-10-12 · HEAD `8b796a6` (+ uncommitted: no) · 27 simulés + 4 réels pass · 0 fail · 4 manual (1 confirmed, 3 deferred)
> Run 2 rejoue tout le parcours simulé (`verify/mock.mjs`) après V1-1 ; la partie réelle (lecture seule) est reprise du run 1 — le correctif ne touche que la liste, dont l'état vide réel est inchangé.
> - V1-1 — pass — table de supervision : 698/698 px à 1024, 954/954 à 1280, 1114/1114 à 1440 (aucun défilement horizontal) ; 0 px de débordement à 360/390, avec et sans JavaScript.

> Run 1 (historique) · 2026-10-12 · HEAD `aca70cf` (+ uncommitted: no) · 33 pass · 0 fail · 1 visible defect (V1-1) · 4 manual (1 confirmed, 3 deferred)
> App : `pnpm exec vite dev --port 3001`, proxy vers la préprod `nsia.c2s-demo.cloud` (offre voyage active, EVO UAT), compte ADMIN. Préprod : **0 contrat voyage** (`totalElements: 0`) et aucune alerte voyage/remboursement → parcours voyage joués sur réponses **interceptées dans le navigateur** (Playwright `route.fulfill`) ; aucune écriture n'a atteint la préprod (toutes les requêtes POST/PUT servies par l'interception). Scripts : scratchpad `verify/real2.mjs` (réel, lecture) et `verify/mock.mjs` (simulé).

**Réel (préprod, lecture seule)**
- AC-13 — pass — menu Contrats › Modifications + Supervision voyage (ADMIN, 54 droits dont `subscription:read-all`/`reconcile`) ; Ctrl+K « voyage » + Entrée → `/contrats/voyage?status=TO_RECONCILE&page=0`.
- AC-5 — pass — `/contrats/voyage` : défaut `?status=TO_RECONCILE&page=0`, « 0 contrat », « Aucun contrat voyage à trancher. » ; filtre « Tous les états » → `?status=ALL` ; requêtes sans `sort` ; `sort` envoyé à la main → 400 (contrat backend confirmé).
- AC-1 — pass — contrat MRH #508 depuis la fiche client → `/contrats/508` : Documents, Quittances, Signature, « Retour à la fiche client », nom du client en lien ; `/clients/253?contract=508` → `/contrats/508` ; `/contrats/999999` → « Contrat introuvable » ; `/contrats/abc` → « Identifiant de contrat invalide. ».
- AC-12 — pass — `/remboursements/1` sans alerte → « Alerte introuvable… », formulaire proposé.

**Simulé (réponses interceptées)**
- S-2 / AC-5 — pass — 4 lignes, « 4 contrats », 2 « Décision possible » + 1 « À partir du … » ; lien « Client #253 » → `/clients/253` sans ouvrir le contrat ; clic ligne → `/contrats/900812?from=voyage&status=TO_RECONCILE&page=0` ; 404 → « L’offre voyage n’est pas active sur ce serveur. » ; 403 → « Accès refusé. ».
- S-3 / AC-6 — pass — encadré + rappel Cover Edge ; boutons actifs après `reconcilableFrom`, désactivés avant avec « Décision possible à partir du 12 oct. 2026, 20:46 (heure d’Abidjan) » (envoi + 24 h lu en UTC) ; « Gave up after 5 attempts » → « Vérifiez la configuration EVO avant de relancer ».
- AC-7 — pass — rattacher `7781` → 422 MISMATCH : « Cette police n’est pas celle du contrat : Coverage dates differ… » sous le champ ; 500 → « EVO ne reconnaît pas cet identifiant… ».
- AC-8 — pass — relancer → 422 `TRAVEL_QUOTE_EXPIRED` → « Le devis EVO a expiré : refusez l’émission. ».
- AC-9 — pass — refuser : motif exigé, puis confirmation « irréversible », envoi `{"reason":"Cover Edge : aucune police…"}`, page relue : badge « Refusée », statut Annulé, encadré disparu.
- AC-2 / AC-3 / AC-4 — pass — contrat CERTIFICATE_READY : Afrique, Standard, « Standard Afrique », Voyageurs (2) « Awa Kouassi », badge « Attestation prête », ni Documents ni Quittances ; « Actualiser depuis EVO » → `?refresh=true` → « Active chez EVO » ; sans `evo` → « EVO indisponible », données locales gardées ; attestation téléchargée « Attestation NSIACIVO00000056.pdf ».
- AC-11 — pass — cloche : « Émission voyage incertaine » → `/contrats/900812?from=voyage&status=TO_RECONCILE&page=0` ; « Fonds FineoPay insuffisants » → aucune navigation ; « Remboursement à traiter » → `/remboursements/77`.
- AC-12 — pass — texte de l’alerte affiché tel quel, RF-77, aide-mémoire ; MTN + 07… → « Un numéro MTN commence par 05. » sans envoi ; 422 `REFUND_INVALID_STATUS` → « Ce remboursement n’attend pas de numéro. » ; succès → PUT `{"operator":"MTN","destination":"+2250544001122"}`, « le versement repart ».
- Responsive (L-007, L-010) — pass — 0 px de débordement de page à 360 et 390 px (liste, contrat voyage, contrat à trancher, remboursement), et à 390 px sans JavaScript.
- AC-14 — pass — dates sans décalage (heure d’Abidjan), « 45 250 FCFA ».
- **V1-1** — visible defect — table de supervision en défilement horizontal à 1024 / 1280 / 1440 (voir *Review findings*).

**Manuel**
- M-1 — manual — confirmed 2026-10-12 — aspect visuel des 3 écrans (`/contrats/voyage`, `/contrats/{id}` voyage, `/remboursements/{id}`), libellés et ton.
- M-2 — manual — deferred (accord utilisateur 2026-10-12, à inscrire dans la PR) — un vrai contrat voyage de la préprod (aucun n’existe à ce jour) : bloc voyage, actualisation EVO réelle, attestation réelle.
- M-3 — manual — deferred (accord utilisateur 2026-10-12, à inscrire dans la PR) — rattachement réel sur EVO UAT (D-11 du brief : seulement avec accord, et un `TO_RECONCILE` ne s’obtient pas à la demande).
- M-4 — manual — deferred (accord utilisateur 2026-10-12, à inscrire dans la PR) — accessibilité du lien client dans une ligne cliquable (R2-1) : axe non disponible ici.

Observations : une fois, l’overlay Vite a affiché « socket hang up » (proxy de dev vers la préprod), non reproduit ; les radios d’opérateur affichent le préfixe « 07… » (lecture un peu sèche).

## Timeline

## Follow-up

## Open questions

- Backend : `GET /subscriptions/travel/{id}` (éviter le parcours de la liste TO_RECONCILE, D-4) — unblocked by: équipe backend.
- Backend : cause structurée sur `REFUND_ATTENTION` ou `GET /refunds/{id}` (afficher le bon formulaire/aide sans texte libre) — unblocked by: équipe backend.
- Backend : filtre `resourceType`/`resourceId` sur `GET /notifications` (D-11) — unblocked by: équipe backend.
- Recette du rattachement réel (EVO UAT, préprod) — unblocked by: accord de l'utilisateur + compte de test.
- NSIA : seul l'ADMIN tranche (backend `questions-ouvertes.md` A.11) — unblocked by: NSIA.
