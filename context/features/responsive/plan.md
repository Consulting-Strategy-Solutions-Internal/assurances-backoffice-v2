# Responsive — tout le back-office

Branche `feat/responsive` (worktree `.claude/worktrees/feat-responsive`), base `main` f9d0c9a. Demande utilisateur (2026-09-30) : « rendre tout le site responsive ».
Source : `context/features/responsive/audit.md` (RSP-1…RSP-31). Conventions : `context/project/ui-registry.md`, `context/project/lessons.md`.
**PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/6
**Status:** in-progress (review round 2 fixes applied, awaiting ship)

## Décisions (prises pour l'exécution, à valider au bilan)

- Largeurs de référence : **360 / 390 / 768 / 1024 / 1280**. Aucune page ne défile horizontalement ; les tables défilent dans leur carte.
- Tiroirs (`Sheet`) : plein écran sous `sm`, taille `sm|md|lg` (430/480/520) au-dessus. Dialogues : hauteur max `100dvh - 2rem`, corps défilant.
- Tables : priorité de colonnes (`hideBelow`), première colonne et colonne d'action collantes ; **vue cartes sous `md`** pour Sinistres, Clients, Cotations, Support, Partenaires, Administrateurs. Tables d'administration (IA, commissions, IAM) : priorités + colonnes collantes (cartes pour Barèmes et IA Pour Tous).
- Breakpoints des primitives exprimés sur la **largeur du contenu** (`@container/main` dans `AppShell`) pour le cas 1024 px avec menu. Structure du menu inchangée.
- KPI compacts sous `sm` ; barre d'outils en grille 2 colonnes sous `sm`.

## Vague 1 — primitives partagées (un agent)

- [x] RSP-1, 7, 8, 28 — `ui/sheet.tsx` (size), `ui/dialog.tsx` (max-h, wide), `FormDialog`, `NotificationsMenu` ; retirer les 7 `w-[NNNpx]` des tiroirs
- [x] RSP-2, 3 — `layout/DataTable.tsx` : `hideBelow`, colonnes collantes, `mobileCard`, états hors zone défilable
- [x] RSP-15 — `@container/main` dans `AppShell` + variantes dans les primitives
- [x] RSP-4, 5, 6, 9, 10, 11, 12, 13, 14 — `KpiCard`/`KpiRow`, `Toolbar`/`ToolbarSearch`/`ResultCount`, `SearchableSelect`/`FilterSelect` fluid, `DateRangeFilter`, `SectionCard`, `InfoList`, `DetailHeaderCard`, onglets/liens/interrupteurs 36 px, `ScrollShadow` (élément actif en vue), `DetailSkeleton`, `Stepper` compact
- [x] Registre UI mis à jour (§ 2, § 6 Responsive, § 8)

## Vague 2 — par zone (agents en parallèle)

- [x] A. Tableau de bord (RSP-16, 17 + tables/KPI)
- [x] B. Sinistres, clients, support, cotations (RSP-18, 19, 20 + cartes mobiles)
- [x] C. Produits IA (RSP-21, 22, 23, 24)
- [x] D. Commissions (RSP-25, 26, 27)
- [x] E. Partenaires, utilisateurs, rôles, permissions, profil, auth (RSP-29, 30, 31 + cartes mobiles)

## Contrôle

Balayage Playwright 360 / 768 / 1024 / 1280 (`scratchpad/demo/resp-sweep.mjs`) : 0 débordement de page, 0 tiroir/dialogue hors écran, colonnes clés visibles.

## Review findings
Lessons applied: L-001…L-008
Last review: round 2 — 2026-09-30 — base `origin/main` f9d0c9a + uncommitted working tree (fixes of round 1) — verdict: ready after the 🟡 items → fixed after round 2 (not re-reviewed): `stickyFrom="sm"` on Schémas, Distributions, Portefeuilles, Accessoires; all columns reachable at 360/390/768 (Playwright, mocked GET rows).

Round 1 : 13/14 confirmed resolved in round 2 (R1-3 completed after round 2).

- [~] **R2-1** 🟡 Portefeuilles : Propriétaire + Relevé collants = 318/326 px à 360 → `stickyFrom="sm"` sur Propriétaire — `src/routes/_auth/commissions.wallets.tsx:372`
- [~] **R2-2** 🟡 Schémas : Actions collante seule = 213 px à 360 → rien de collant sous 576 px de contenu — `src/routes/_auth/commissions.schemes.tsx:274`
- [~] **R2-3** 🟡 Accessoires IA : Tranche + Actions collantes = 284/326 px → `stickyFrom="sm"` sur Tranche — `src/components/ia-products/accessories/IaAccessoriesScreen.tsx:169`
- [~] **R2-4** ⚪ Survol d'une ligne sélectionnée : cellules collantes grises → règle de survol limitée à `:not([data-selected])` — `src/styles.css:142`
- [~] **R2-5** ⚪ Classes collantes « from sm » copiées dans 2 routes → prop partagée `stickyFrom` sur `DataTableHead`/`DataTableCell` (test « sticky from sm ») — `src/components/layout/DataTable.tsx`
- [x] **R2-6** ⚪ ~~Stepper sans test~~ refuted — tests existants `primitives-responsive.test.tsx` (« marks the current step aria-current=step in both modes », clic sur barre compacte)
