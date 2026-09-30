# Correctifs UX (audit du 2026-09-30)

**PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/5 (branche `feat/ia-products`, 2026-09-30)
**Status:** shipped — fusionnée dans `main` via la PR #5 (2026-09-30). Suivi : les ⚪ R3-2…R3-4 ont été corrigés sans relecture dédiée ; points hors périmètre et demandes backend listés dans la PR.
Source : `context/project/ux-audit-2026-09-30.md`. L'utilisateur a demandé de **tout** corriger.
Décisions utilisateur : pages `/products*` supprimées (fait) ; recherche de la Topbar à rendre **fonctionnelle** (recherche globale).
Conventions : `context/project/ui-registry.md`, `context/memory.md`.

## Décisions prises pour l'exécution (à valider par l'utilisateur au bilan)

- Menu « Produits → Individuel Accidents → IA Standard / IA Pour Tous » **conservé tel quel** (structure demandée explicitement par l'utilisateur). Les sous-titres de pages s'alignent sur « Individuel Accidents ».
- « Wallets » → « Portefeuilles » (menu + titres).
- Montants FCFA affichés **sans décimales** (le franc CFA n'a pas de centimes), séparateur de milliers = espace insécable visible. Les valeurs envoyées à l'API restent exactes.
- Recherche/filtres sans support serveur : on charge **toutes** les pages (`fetchAllPages`, plafond affiché) quand le volume est petit, et le périmètre est toujours écrit (« sur N éléments »).
- (R1-4) Tendances du tableau de bord : comparaison à la **même durée écoulée** de la période précédente (1–3 sept vs 1–3 août ; jour absent → fin du mois court).
- (R1-13) Répartition par défaut des commissions (50/50, 40/30/30) marquée « à confirmer » : Enregistrer bloqué tant qu'un curseur n'a pas bougé ou que « Confirmer cette répartition » n'a pas été cliqué ; un schéma existant à 100 % est déjà confirmé.
- (R1-27) « Sinistres en cours » = SUBMITTED + UNDER_REVIEW + INFO_REQUESTED (même définition que le compteur du tableau de bord), filtre `status=OPEN`.
- (R1-38) Curseurs de répartition : pas de 0,5 % au glisser, Maj+←/→ = 0,01 % ; une valeur au centième n'est pas arrondie tant qu'on ne touche pas son curseur.
- Recherche globale : panneau de résultats groupés (Pages, Clients, Partenaires, Administrateurs, Tickets support, Sinistres, Métiers IA), raccourci Ctrl/⌘+K, vidée à chaque navigation. Elle ne filtre plus les pages (chaque page garde sa propre recherche de toolbar).

## Vague 1 — socle transverse (un agent)

- [x] Router : `notFoundComponent` + `errorComponent` stylés (EmptyState card), dans le shell quand connecté.
- [x] Recherche globale fonctionnelle (Topbar) + suppression du couplage `useShell().search` dans les pages.
- [x] Sélecteur de période retiré de la Topbar (l'état reste dans le shell ; la vague 2 « dashboard » l'affiche dans la page).
- [x] Titre d'onglet par route (`head()` sur chaque fichier de route) + skip-link vers `#main`.
- [x] Garde « modifications non enregistrées » : `FormDialog` (prop `dirty`) + hook partagé pour drawers/wizards/pages.
- [x] Contraste AA : `--muted-foreground`, teintes de `PILL_TONES` (≥ 4,5:1), en-têtes de table ≥ 11,5px lisibles.
- [x] Cibles ≥ 36px : `SegmentedPills`, boutons-icônes des tables.
- [x] `DataTableCard` et onglets : ombre/indice de défilement horizontal.
- [x] `formatFcfa` : sans décimales, espace insécable visible, `tabular-nums`.
- [x] Traduction des messages backend : `src/lib/backend-messages.ts` (holdReason, messages 400/403/409 connus, lignes CSV) branché dans `apiErrorMessage` ; descriptions de rôles ; compléter `permission-labels.ts` (actuator, amendment, backoffice, subscription…).
- [x] `SearchableSelect` : état `loading`, option `onSearch` (recherche serveur), texte d'aide quand désactivé (`disabledHint`).
- [x] `TruncatedText` (tronque + `title`) partagé ; `formatPersonName` partagé (casse et ordre uniformes).
- [x] Sidebar : repli hors-canevas sous `lg` (bouton menu dans la Topbar), sous-groupe ouvert quand on arrive par lien profond, « Portefeuilles ».
- [x] Connexion : pas de `min(8)` à la connexion, `autoComplete`, bouton afficher/masquer, bouton désactivé avant hydratation.
- [x] Supprimer les `console.error` de production.
- [x] Nettoyer `services/products.ts` des fonctions devenues inutiles (création/suppression produit, catégories).

## Vague 2 — par zone (agents en parallèle)

- [x] A. Sinistres + Clients
- [x] B. Support + Cotations
- [x] C. Commissions
- [x] D. Partenaires + Administrateurs + Rôles + Permissions + Profil
- [x] E. Produits IA
- [x] F. Tableau de bord

## Review findings
Lessons applied: L-001, L-002, L-003, L-004, L-005, L-006
Last review: round 3 — 2026-09-30 — base `origin/main` 7a9e732, HEAD 7a9e732 + uncommitted working tree (fixes of round 2) — verdict: ready after the 🟡 item → 🟡 refuted (GET /roles on the demo: ADMIN `system=false, userAssignable=true`, so admins stay listed).

Rounds 1–2 : 42/42 R1 items and R2-1…R2-9 confirmed resolved in round 3 (R2-4 completed after round 3).

- [x] **R3-1** 🟡 ~~ADMIN could vanish from /users if `userAssignable=false`~~ refuted — real `GET /roles`: ADMIN system=false, userAssignable=true — `src/lib/admin-roles.ts:40`
- [~] **R3-2** ⚪ Server error on `isActive` lost (declared form field, never shown) → shown under the switch — `src/components/ia-products/premium-modifiers/PremiumModifierDialog.tsx:218`
- [~] **R3-3** ⚪ Orphan banner showed the raw API key → French label table, raw key as fallback — `src/lib/ia-errors.ts:124`
- [~] **R3-4** ⚪ Page clamp rewrote `?status=` while permissions load → keeps the requested status (test « page hors limites pendant le chargement des droits ») — `src/components/ia-products/risk-classes/RiskClassesScreen.tsx:100`

