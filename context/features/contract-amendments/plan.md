# Modifications de contrat — plan

**Status:** done · **Spec :** `spec.md` · **PR:** —
**Lessons applied:** L-001…L-010

## Étapes
- [x] Types + helpers (`src/lib/amendments.ts`) et service (`src/services/amendments.ts`)
- [x] Liste `/contrats/modifications` (onglets par statut, produit, tri, page dans l'URL, cartes mobiles)
- [x] Détail `/contrats/modifications/$amendmentId` (comparatif DRAFT/AWAITING_PAYMENT, état demandé seul sinon, écart, quittance, PDF)
- [x] Actions Valider / Supprimer, erreurs traduites, rafraîchissement
- [x] Menu « Contrats › Modifications », libellés des permissions
- [x] Tests simulés des 5 cas + vérification en lecture seule contre la démo

## Vérification en lecture seule (démo, 2026-09-30)
- API (curl, GET) : liste par statut (DRAFT 0, AWAITING_PAYMENT 0, APPLIED 1, DELETED 0) ; détail #1 ; 404 `Amendment not found with id: 999999` ; `sort=id,desc` → 400 « Invalid sort property » ; PDF `policy-document?amendment=1` → 200 `application/pdf`.
- Navigateur (Playwright, écritures bloquées) : liste (4 onglets) et détail #1 à 360, 390 et 1280 px (après correctifs), et sans JavaScript à 390 px (Sinistres, Clients, Modifications), aucun débordement, aucune erreur de page. Vue « À traiter » + confirmation de validation vérifiées sur données GET simulées.

## Décisions prises en cours de route
- Pas de page « fiche contrat » au back-office : le nom du client renvoie vers `/clients/{clientId}` (lu via `GET /subscriptions/{id}`) ; n° de police et de contrat en texte.
- Le menu reste masqué quand les droits sont inconnus (rôle sans `iam:read`, règle L-005) : limite connue, la page reste joignable par URL. Les boutons Valider / Supprimer, eux, suivent `can` (le serveur refuse en 403).

- L'URL du détail porte la vue de la liste (`?status=…&product=…&sort=…&page=…`) pour que « Retour » la retrouve ; un lien partagé contient donc ces paramètres (sans effet sur le détail affiché).

## Review findings
**Round 2** — 2026-09-30 · base `2ea9722` · HEAD `2ea9722` + changements non commités · verdict : prêt (⚪ seulement)
- [~] **R2-1** ⚪ États introuvable / refusé / erreur : « Retour » ignore la vue d'origine (`backSearch`) — `contrats.modifications_.$amendmentId.tsx:120` (fixed after round 2, not re-reviewed)
- [~] **R2-2** ⚪ Schéma de recherche de la liste recopié dans le détail (tris, type) — `contrats.modifications_.$amendmentId.tsx:66` (fixed after round 2, not re-reviewed)
- [~] **R2-3** ⚪ (contrôle navigateur sans JS, antérieur à la feature) `Toolbar` étirait le `<select aria-hidden>` caché de Radix à toute la largeur avant l'hydratation → +30 px de défilement à 390 px sur Clients et Modifications — `src/components/layout/Toolbar.tsx:12` (fixed after round 2, not re-reviewed)

**Round 1** — 2026-09-30 · base `2ea9722` · HEAD `2ea9722` + changements non commités · verdict : prêt après les 🟡
- [x] **R1-1** 🟡 Valider/Supprimer masqués si droits inconnus (`canKnown` au lieu de `can`) — `src/routes/_auth/contrats.modifications_.$amendmentId.tsx:328` (fixed, round 2)
- [x] **R1-2** 🟡 Le test « permissions inconnues » n'exerce pas `permissions === null` — `src/routes/-amendment-detail.test.tsx:254` (fixed, round 2)
- [x] **R1-3** ⚪ « Réessayer » affiché même sur 403 (drapeau `retry` ignoré) — `contrats.modifications_.$amendmentId.tsx:293` (fixed, round 2)
- [x] **R1-4** ⚪ Compteur bloqué sur « Chargement… » en erreur — `contrats.modifications.tsx:195` (fixed, round 2)
- [x] **R1-5** ⚪ « Retour » perd produit/tri/page et change d'onglet — `contrats.modifications_.$amendmentId.tsx:340` (fixed, round 2)
- [x] **R1-6** ⚪ Bandeaux faits main (hex en dur) au lieu du bandeau du registre — `contrats.modifications_.$amendmentId.tsx:402` (fixed, round 2)
- [x] **R1-7** ⚪ Fixtures : n° de quittance hors format `Q-{année}-{6 chiffres}` — `src/lib/amendments.fixtures.ts:184` (fixed, round 2)
- [~] **R1-8** ⚪ Clé de requête ad hoc pour le détail du contrat — `contrats.modifications_.$amendmentId.tsx:275` (reopened round 2 : `subscriptionsKeys.detail` ajouté mais pas utilisé) (fixed after round 2, not re-reviewed)
- [x] **R1-9** ⚪ Onglets au singulier (« Appliquée », « Supprimée ») — contrôle navigateur (fixed, round 2)
- [x] **R1-10** ⚪ Libellé du tri tronqué à 1280 px — contrôle navigateur (fixed, round 2)
- [x] **R1-11** ⚪ En-tête « Modification n° 901 » = id technique, confondu avec le n° d'avenant — contrôle navigateur (fixed, round 2)
- [~] **R1-12** ⚪ Onglets écrasés à 390 px (libellés sur 4 lignes, « Supprimées » coupé) : bande d'onglets sans retour à la ligne dans `ScrollShadow` (ui-registry.md:378) — contrôle navigateur (fixed after round 2, not re-reviewed)
