# Audit responsive — NSIA back-office

> 2026-09-30 · branche `feat/responsive` · lecture seule (aucune écriture envoyée au backend de démo : chaque requête non-GET hors `/auth/` était bloquée, 0 écriture passée).
> Méthode : Playwright sur http://localhost:3000, largeurs **360 / 390 / 768 / 1024 / 1280** (hauteur 800), 27 pages × 5 largeurs + 18 scénarios d’interaction (tiroirs, dialogues, menu, recherche, notifications, assistant de schéma) à 360 / 768 / 1280. Mesures automatiques par page : débordement horizontal (`documentElement`, `body` **et `#main`**, qui est le vrai conteneur de défilement), éléments qui dépassent, tables (largeur visible / défilable, colonnes hors écran), cibles tactiles < 36 px, textes tronqués ou coupés, boîtes des dialogues/tiroirs, éléments sticky, graphiques. Complété par un grep du code.
> Captures : `…/scratchpad/demo/shots/resp-*.png` (`resp-<page>-<largeur>.png` = écran, `resp-tall-<page>-<largeur>.png` = page entière, `resp-int-<scénario>-<largeur>.png` = interaction, `resp-wiz-step<n>-<largeur>.png` = assistant).

## Résumé

La base tient bien : **aucune page ne fait défiler la page horizontalement**, sauf Cotations à 360/390 (19 px / 4 px, cause : une carte KPI). Le menu latéral hors écran sous `lg`, la recherche globale, la barre du haut sticky (72 px) et les dialogues `FormDialog` passent à toutes les largeurs. Les 24 tables défilent **dans** leur `DataTableCard`, avec ombres de bord, et ne cassent pas la page.

Les vrais problèmes :

1. **🔴 Les 7 tiroirs latéraux (`Sheet` à droite) ont une largeur fixe (430–520 px)**. Sur téléphone, ils sortent de l’écran par la gauche (jusqu’à 160 px coupés) : titre, libellés et première colonne sont illisibles. Ça touche Cotations, Classes IA, Administrateurs, Rôles (détail et création) et Permissions.
2. **Les tables sur mobile ne montrent que 2 à 3 colonnes.** La colonne utile (statut, montant, actions) est hors écran, et parfois encore à 768/1024 (Cotations « Prime TTC », Barèmes « Actions », Distributions « Rejouer »). Les états vides des tables sont centrés sur toute la largeur défilable, donc leur texte est coupé.
3. **Les primitives de page ne sont pas pensées pour 360 px.** Les KPI prennent tout le premier écran (cartes de 155 à 175 px de haut, une seule colonne en `cols={3}`). Les filtres à largeur fixe s’empilent en escalier. Les en-têtes de `SectionCard` ne passent pas à la ligne. `InfoList columns={2}` n’a pas de breakpoint. Les dialogues de base n’ont pas de hauteur max. Le menu des notifications fait 380 px de large.
4. **À 1024 px, le menu latéral apparaît** et laisse 700 px de contenu, comme une tablette. Mais les breakpoints se basent sur le viewport, donc les tables et les KPI se comportent comme à 1280.

Presque tout se corrige dans les primitives partagées (`ui/sheet.tsx`, `ui/dialog.tsx`, `layout/DataTable.tsx`, `layout/Toolbar.tsx`, `layout/KpiRow.tsx` + `dashboard/KpiCard.tsx`, `layout/SectionCard.tsx`, `layout/InfoList.tsx`, `layout/DetailHeaderCard.tsx`) plutôt que page par page.

**Non audité** : le détail d’un sinistre. La démo ne renvoie plus aucun sinistre ni type de sinistre (listes vides au moment de l’audit). Le code du squelette est tout de même relevé (RSP-14).

**À savoir pour le dev** : pendant l’audit, le backend de démo s’est mis à poser ses cookies d’authentification avec `Domain=<backend>; Secure`. Le navigateur les rejette sur `http://localhost`, et **la session est perdue au premier rechargement complet** (retour sur `/login`). Contourné dans Playwright en réécrivant `Set-Cookie` ; ça peut gêner toute recette locale. À vérifier côté proxy (`vite.config.ts`, réécriture du domaine des cookies) ou côté backend.

### Comptes

| Zone                                                    | 🔴    | 🟡     | ⚪     | Total  |
| ------------------------------------------------------- | ----- | ------ | ------ | ------ |
| Shell et composants partagés                            | 1     | 7      | 7      | 15     |
| Tableau de bord                                         | 0     | 1      | 1      | 2      |
| Sinistres / clients / support / cotations               | 0     | 2      | 1      | 3      |
| Produits IA                                             | 0     | 1      | 3      | 4      |
| Commissions                                             | 0     | 3      | 1      | 4      |
| Partenaires / utilisateurs / rôles / permissions / profil / auth | 0 | 1  | 2      | 3      |
| **Total**                                               | **1** | **15** | **15** | **31** |

Sévérité : 🔴 inutilisable · 🟡 dégradé · ⚪ finition.

---

## 1. Shell et composants partagés

### RSP-1 🔴 Tiroirs latéraux plus larges que l’écran sur téléphone

- **Pages** : Cotations (détail), Classes IA (tiroir de classe), Administrateurs (`AdminDetailDrawer`), Rôles (détail et « Créer un rôle »), Permissions (`PermissionDrawer`), et tout usage de `DetailDrawer`. **360, 390** (et toute largeur < largeur du tiroir).
- **Mesure** : boîte du tiroir à 360 = `left −160 px, 520 px` (cotations, classe), `−120 px, 480 px` (admin, rôle, création de rôle), `−100 px, 460 px` (permission). Le côté gauche est coupé : titre, eyebrow et libellés illisibles.
- **Cause** : `className="w-[520px] … sm:max-w-[520px]"`. Le `w-[…]` écrase le `w-3/4` de base de `SheetContent`, et `sm:max-w` ne s’applique qu’à partir de 640 px. Fichiers : `src/components/quotations/QuotationDetailDrawer.tsx:408`, `ia-products/risk-classes/RiskClassDrawer.tsx:76`, `users/AdminDetailDrawer.tsx:68`, `roles/RoleDetailDrawer.tsx:111`, `roles/CreateRoleDrawer.tsx:34`, `permissions/PermissionDrawer.tsx:204`, `dashboard/DetailDrawer.tsx:52`.
- **Captures** : `resp-int-cot-drawer-360.png`, `resp-int-class-drawer-360.png`, `resp-int-admin-drawer-360.png`, `resp-int-role-drawer-360.png`, `resp-int-role-create-360.png`, `resp-int-perm-drawer-360.png`.
- **Correctif** : ajouter une prop `size?: 'sm'|'md'|'lg'` (430/480/520) à `SheetContent` (`ui/sheet.tsx:60`), qui produit `w-full sm:w-[520px] sm:max-w-[520px]`. Sous `sm`, le tiroir passe en plein écran, avec en-tête et pied collés. Retirer ensuite les `w-[NNNpx]` des 7 appels. Ajouter la règle au registre UI (§ 3 « Drawers »).

### RSP-2 🟡 Tables : les colonnes clés sont hors écran sur mobile, et parfois jusqu’à 1024

- **Mesures** (largeur visible → largeur de la table, colonnes hors écran à l’ouverture) :

  | Page | 360 | 768 / 1024 |
  | --- | --- | --- |
  | Tableau de bord · Derniers contrats | 326 → 622 · Statut, Créé le | — |
  | Sinistres | 326 → 672 · Survenance, Déclaré par, Créé le | — |
  | Clients | 326 → 997 · Email, Adresse, Inscrit le, Vérifications | 698 → 997 · Inscrit le, Vérifications (défile encore à 1280 : 954 → 997) |
  | Support | 326 → 765 · Dernière activité, Créé le (le « Pris en charge » est coupé) | 698 → 765 |
  | **Cotations** | 326 → 866 · **Émis par, Statut, Prime TTC** | **698 → 866 · Prime TTC** |
  | Classes IA | 326 → 764 · Métiers, Statut, Mise à jour | 698 → 764 |
  | **Barèmes** | 326 → 880 · **Décès, Invalidité, Frais méd., Actions** | 698 → 880 · **Actions** |
  | Majorations | 326 → 786 · Type, Taux, Statut, Actions | 698 → 786 |
  | Accessoires | 326 → 535 · Mise à jour, Actions | — |
  | **IA Pour Tous** | 326 → 863 · Primes, Actions | **698 → 863 · Actions** |
  | Schémas | 326 → 880 · Niveau max., Répartition, Mise à jour, Actions | 698 → 880 |
  | **Distributions** | 326 → 644 · Pot, Créée le, Statut, **Action** | 1024 : 698 → 876 · **Action** |
  | Portefeuilles | 326 → 564 · Solde, Relevé | — |
  | Partenaires | 326 → 737 · Localisation, Email | 698 → 737 |
  | Partenaire (agences / agents directs) | 326 → 500 / 469 · Agents / Créé le | — |
  | Administrateurs | 326 → 563 · Email vérifié | — |
  | Rôles | 326 → 692 · Accès accordés | — |
  | Permissions | 326 → 456 | — |

- **Cause** : `DataTableCard` (`layout/DataTable.tsx:16`) ne prévoit rien pour les petites largeurs : ni priorité de colonne, ni première colonne collante, ni vue alternative. Des largeurs fixes gonflent certaines tables (voir RSP-21, RSP-24, RSP-29).
- **Captures** : `resp-tall-*-360.png` (toutes), `resp-cotations-768.png`, `resp-produits-ia_ia-standard_baremes-1024.png`, `resp-commissions_distributions-1024.png`.
- **Correctif** : voir la « Stratégie tables » en fin de document. Il faut une prop de priorité (`hideBelow="md"|"lg"|"xl"`) sur `DataTableHead`/`TableCell`, une première colonne `sticky left-0`, et une vue cartes sous `md` pour les listes à fort trafic.

### RSP-3 🟡 États vides et erreurs des tables coupés sur mobile

- **Pages** : toute table vide ou en erreur à 360/390 : tableau de bord « Sinistres à traiter », Sinistres, Types de sinistre, Distributions, fiche partenaire (Agences, Agents directs)…
- **Constat** : l’`EmptyState` occupe une cellule `colSpan` de toute la largeur défilable (444 à 880 px). Il est centré sur cette largeur, pas sur la partie visible. Résultat : « Aucune agence pour ce part… », « Les nouvelles déclarations apparaîtron… ».
- **Cause** : `TableEmptyState` / `TableErrorState`, `src/components/layout/DataTable.tsx:127-186`.
- **Captures** : `resp-tall-dashboard-360.png` (bas), `resp-tall-sinistres_types-360.png`, `resp-tall-partners_1453-360.png`, `resp-tall-commissions_distributions-360.png`.
- **Correctif** : dans ces deux composants, envelopper l’`EmptyState` dans un bloc `sticky left-0` dont la largeur est celle du conteneur visible (par exemple `w-[var(--table-viewport)]` alimenté par `useScrollShadow`, ou plus simplement `max-w-[calc(100vw-2rem)] lg:max-w-none`). Autre option : rendre l’état **hors** du `<Table>` via une prop `state` de `DataTableCard`.

### RSP-4 🟡 Montant KPI trop long : débordement de la carte et de la page

- **Pages** : Cotations (« 75 805 FCFA — Prime TTC cumulée »), à **360** (`#main` défile de 19 px) et **390** (4 px). Tout KPI montant ≥ 6 chiffres est concerné.
- **Cause** : valeur en `text-[30px]` sans adaptation (`src/components/dashboard/KpiCard.tsx:67`). `formatFcfa` ne coupe jamais la ligne (espaces insécables), dans une carte de 156 px (grille 2 colonnes).
- **Capture** : `resp-cotations-360.png`, `resp-tall-cotations-360.png`.
- **Correctif** : dans `KpiCard`, écrire la valeur en `text-[24px] sm:text-[30px]`, ajouter `min-w-0` sur la carte, et afficher l’unité à part en petit, comme le fait déjà le tableau de bord (« 880 FCFA »). Par exemple une prop `unit` rendue `text-[15px] font-bold`.

### RSP-5 🟡 Les KPI occupent tout le premier écran sur téléphone

- **Pages** : toutes les pages avec `KpiRow`, à 360/390.
- **Constat** : avec `cols={4}`, on a 2×2 cartes de 155 à 175 px, soit environ 370 px avant le premier filtre. Avec `cols={3}` (fiches client/partenaire/sinistre, Types de sinistre, Distributions), on a **une colonne**, donc 3 cartes empilées d’environ 155 px (≈ 500 px). Sur Types de sinistre et Distributions, le premier contenu utile arrive après 800 px.
- **Cause** : `KpiRow.tsx:21` (`sm:grid-cols-3` sans base pour `cols=3`) et la mise en page verticale de `KpiCard` (icône 40 px, puis valeur, puis libellé, `py-[19px]`).
- **Captures** : `resp-sinistres_types-360.png`, `resp-tall-clients_106-360.png`, `resp-tall-commissions_distributions-360.png`, `resp-tall-partners_1453-360.png`.
- **Correctif** : une variante compacte de `KpiCard` sous `sm` (icône 32 px à gauche, valeur 22 px et libellé à droite, `py-3`, hauteur ≈ 72 px), et `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` (la 3ᵉ carte en `col-span-2`) ou une bande défilante (`ScrollShadow` + `snap-x`). Le choix se fait une fois dans `KpiRow`/`KpiCard`.

### RSP-6 🟡 Filtres de barre d’outils à largeur fixe : empilement en escalier sur mobile

- **Pages** : Sinistres (recherche + 4 contrôles = 5 lignes, barre d’environ 270 px), Clients, Types, Support, Cotations, Schémas, Distributions, Portefeuilles, Partenaires… à 360/390.
- **Constat** : chaque `Select`/`SearchableSelect` garde 170 à 240 px, un par ligne, avec des largeurs différentes. La recherche a `min-w-[240px]` et son placeholder est tronqué (« Numéro, client, type, produit, cor… »).
- **Cause** : `layout/Toolbar.tsx:28` (flex-wrap sans règle mobile) et `:55` (`min-w-[240px]`), `layout/SearchableSelect.tsx:122` (`w-[220px]` par défaut), `claims/FilterSelect.tsx:45` (`w-[170px]`), et des largeurs locales : `sinistres.tsx:277,285`, `clients.tsx:204`, `support.tsx:191`, `cotations.tsx:369`, `commissions.distributions.tsx:214`, `commissions.wallets.tsx:282`.
- **Captures** : `resp-sinistres-360.png`, `resp-tall-clients-360.png`, `resp-tall-cotations-360.png`.
- **Correctif** : dans `Toolbar`, sous `sm`, passer en `grid grid-cols-2 gap-2` : recherche et `SegmentedPills` sur `col-span-2`, contrôles `w-full` (sélecteur `[&_[data-slot=select-trigger]]:max-sm:w-full`, ou une prop `fluid` sur `SearchableSelect`/`FilterSelect`). Mettre `min-w-0 sm:min-w-[240px]` sur `ToolbarSearch`. Au-delà de 3 filtres, envisager un bouton « Filtres (n) » qui ouvre un `Sheet` du bas sous `md`.

### RSP-7 🟡 Dialogues sans hauteur maximale

- **Pages** : « Nouvelle formule » (IA Pour Tous) à **360**. Le dialogue fait 805 px pour 800 de viewport, son haut est à −2 px, et à 390 × 700 ou en paysage il déborde nettement. Même risque pour `ClaimActionDialog` et `ConfirmDialog` avec un long contenu.
- **Cause** : `DialogContent` (`src/components/ui/dialog.tsx:62`) n’a ni `max-h` ni défilement. `FormDialog` (`forms/FormDialog.tsx:67,93`) limite le **corps** (`max-h-[60vh]`/`[68vh]`), mais pas l’ensemble en-tête + pied (≈ 250 px à 360, où le pied s’empile en colonne).
- **Captures** : `resp-int-formule-new-360.png`, `resp-int-claim-dialog-360.png`, `resp-int-admin-add-360.png`.
- **Correctif** : ajouter `max-h-[calc(100dvh-2rem)]` dans `DialogContent`. Dans `FormDialog`, mettre le contenu en `flex flex-col` avec corps `min-h-0 flex-1 overflow-y-auto` à la place des `max-h-[..vh]`. Sous `sm`, pied en `grid grid-cols-2` (Annuler | action) au lieu de la colonne inversée, pour gagner environ 50 px.

### RSP-8 🟡 Menu des notifications plus large que le téléphone

- **Page** : barre du haut, **360/390**. Menu de 380 px : « Tout marquer lu » est coupé à droite.
- **Cause** : `src/components/notifications/NotificationsMenu.tsx:103` (`w-[380px]`).
- **Capture** : `resp-int-notif-360.png`.
- **Correctif** : `w-[min(380px,calc(100vw-1rem))]` (Radix garde l’alignement `end`) et `collisionPadding={8}`.

### RSP-9 ⚪ `ResultCount` : le compteur se coupe à côté de la note

- **Page** : Clients (« 15 / clients » sur 2 lignes à côté de « La recherche et les indicateurs portent sur les 15 clients. »), 360/390. Même situation sur Sinistres.
- **Cause** : `src/components/layout/Toolbar.tsx:78` (`flex justify-between` sans passage à la ligne).
- **Capture** : `resp-tall-clients-360.png`.
- **Correctif** : `flex flex-wrap gap-x-3 gap-y-0.5`, compteur en `whitespace-nowrap`, note en `basis-full sm:basis-auto sm:text-right`.

### RSP-10 ⚪ L’en-tête de `SectionCard` ne passe pas à la ligne

- **Pages** : Prorata (« Grille par défaut appliquée par le système » : un mot par ligne à côté de « Personnaliser la grille »), tableau de bord « Derniers contrats » / « Sinistres à traiter », fiche partenaire « Agences » (badge), à 360/390.
- **Cause** : `src/components/layout/SectionCard.tsx:35` (`flex items-center justify-between`) et `:50` (action `shrink-0`).
- **Captures** : `resp-tall-produits-ia_ia-standard_prorata-360.png`, `resp-tall-dashboard-360.png`.
- **Correctif** : `flex flex-wrap items-start justify-between gap-x-4 gap-y-3`, action en `max-sm:w-full` quand c’est un bouton, et `px-4 sm:px-6` sur l’en-tête et le corps (24 px de marge interne, c’est beaucoup à 360).

### RSP-11 ⚪ `InfoList columns={2}` sans breakpoint

- **Pages** : fiches partenaire, client et sinistre, à 360. Les valeurs longues se coupent en plein mot (« victorien.fofana@n / siaassurances.com »).
- **Cause** : `src/components/layout/InfoList.tsx:21` (`grid-cols-2`).
- **Capture** : `resp-tall-partners_1453-360.png`.
- **Correctif** : `sm:grid-cols-2` (1 colonne sous `sm`), ou `grid-cols-[repeat(auto-fit,minmax(160px,1fr))]`.

### RSP-12 ⚪ `DetailHeaderCard` serré sur téléphone

- **Pages** : ticket support (titre sur 2 lignes et méta sur 4 lignes dans environ 190 px), fiche client, fiche partenaire, à 360/390.
- **Cause** : `src/components/layout/DetailHeaderCard.tsx:25-31`. Avatar 72 px avec `gap-5` à côté du titre, carte `p-6`, H1 en 26 px.
- **Captures** : `resp-tall-support_52-360.png`, `resp-tall-clients_106-360.png`.
- **Correctif** : sous `sm`, `p-4`, avatar 56 px (`[&>*:first-child]:max-sm:size-14`) au-dessus du titre (`flex-col items-start`), H1 en `text-[22px] sm:text-[26px]`, actions en `w-full` avec 2 boutons côte à côte.

### RSP-13 ⚪ Cibles tactiles < 36 px

- **Onglets IA Standard** : 28 px de haut, à toutes les largeurs (`src/routes/_auth/produits-ia.ia-standard.tsx:78-87` ; le `TabsTrigger` shadcn fait `h-[calc(100%-1px)]` avec `py-1`).
- **Liens texte du tableau de bord** : « Tout voir → », « Voir les clients → », « Ouvrir », « Voir », 20 px de haut (`dashboard-home/ClaimsToProcess.tsx:47`, `AttentionCard.tsx:111`, `LatestContracts`).
- **Interrupteurs** « Activer/Désactiver la formule » : 36×20 (IA Pour Tous).
- **Lien** « Retour à la connexion » : 20 px (`/forgot-password`).
- **Captures** : `resp-produits-ia_ia-standard_classes-360.png`, `resp-dashboard-360.png`, `resp-produits-ia_ia-pour-tous-360.png`, `resp-forgot-password-360.png`.
- **Correctif** : `min-h-9` sur les déclencheurs d’onglets (`TabsList` en `h-11`, déjà là). Pour les liens d’action, `inline-flex min-h-9 items-center px-2 -mx-2`. Pour l’interrupteur, une zone cliquable élargie (`relative after:absolute after:-inset-2`). Ajouter la règle au registre UI § 8 « sizes ».

### RSP-14 ⚪ Squelettes de chargement des fiches en 3 colonnes fixes

- **Pages** : fiches sinistre, client et partenaire pendant le chargement, à 360/390. Le squelette montre 3 KPI côte à côte (grille fixe), puis la page réelle passe à 1 colonne : saut de mise en page.
- **Cause** : `src/routes/_auth/sinistres_.$claimId.tsx:237`, `clients_.$clientId.tsx:141`, `partners_.$partnerId.tsx:67` (`grid grid-cols-3`).
- **Correctif** : réutiliser `<KpiRow cols={3}>` dans le squelette (ou créer un `DetailSkeleton` partagé dans `layout/`), pour que la grille suive la même règle que la page.

### RSP-15 ⚪ À 1024, le contenu fait 700 px mais se comporte comme à 1280

- **Pages** : toutes à **1024**. Le menu latéral apparaît (`lg`) et laisse 700 px de contenu, comme à 768 sans menu. Les tables gardent donc leurs colonnes hors écran (Cotations « Prime TTC », Barèmes « Actions », IA Pour Tous « Actions », Distributions « Action », Clients), et les KPI restent en 2×2 (`xl:grid-cols-4`).
- **Cause** : breakpoints basés sur le viewport, alors que la largeur utile dépend de la présence du menu (`AppShell.tsx:50`, `Sidebar` visible dès `lg`).
- **Captures** : `resp-cotations-1024.png`, `resp-produits-ia_ia-standard_baremes-1024.png`, `resp-commissions_distributions-1024.png`.
- **Correctif** : déclarer `@container/main` sur la colonne de contenu (`AppShell.tsx:50`, Tailwind v4 natif) et utiliser des variantes `@md/main:` / `@3xl/main:` dans les primitives (`KpiRow`, priorités de colonnes de `DataTable`, `Toolbar`). Autre option : un menu réduit à une barre d’icônes entre `lg` et `xl`. Le registre dit « Menu structure is fixed » : ça reste compatible, puisque seule la présentation change.

## 2. Tableau de bord

### RSP-16 🟡 Graphique « Primes activées par mois » : étiquettes de mois superposées

- **Page** : `/dashboard`, à **360/390** (et serré à 768). Les 12 mois s’écrasent (« octnovdécjanvfévmars… »).
- **Cause** : `src/components/dashboard-home/PremiumsChart.tsx:64-69` (`XAxis interval={0}`) dans un conteneur de 278 px.
- **Captures** : `resp-tall-dashboard-360.png`, `resp-tall-dashboard-768.png`.
- **Correctif** : `interval="preserveStartEnd"` avec `minTickGap={8}`, ou un `tickFormatter` qui ne garde que l’initiale (ou un mois sur deux) quand la largeur est < 480 (`useIsMobile`/`ResizeObserver`). Réduire aussi la hauteur à `h-[220px] sm:h-[280px]`.

### RSP-17 ⚪ 8 cartes KPI avant le premier contenu sur téléphone

- **Page** : `/dashboard`, 360/390. 2 blocs × 4 KPI (≈ 1 050 px), puis « Derniers contrats » à environ 1 150 px. Le sélecteur Jour/Mois/Trimestre/Année est au milieu.
- **Capture** : `resp-tall-dashboard-360.png`.
- **Correctif** : découle de RSP-5 (cartes compactes, ≈ 72 px). On peut aussi présenter le second bloc (« Activité sur le mois ») en bande défilante `ScrollShadow` sous `sm`.

## 3. Sinistres, clients, support, cotations

### RSP-18 🟡 Cotations : le filtre « Du … au … » sort de la barre d’outils

- **Page** : `/cotations`, 360/390. Les deux champs date de 130 px et leurs libellés (≈ 330 px) ne passent pas à la ligne dans une carte de 300 px : le champ « au » dépasse le bord.
- **Cause** : `src/routes/_auth/cotations.tsx:381-396` (`flex items-center gap-2` sans passage à la ligne, `w-[130px]`).
- **Capture** : `resp-tall-cotations-360.png`.
- **Correctif** : extraire un `DateRangeFilter` dans `layout/`, en `grid grid-cols-[auto_1fr_auto_1fr]` sous `sm` avec des champs `w-full`, et `w-[130px]` au-dessus. Le réutiliser partout où une plage de dates filtre une liste.

### RSP-19 🟡 Conversation support : le fil et la zone de réponse ne tiennent pas ensemble

- **Page** : `/support/52`, 360/390 (page de 1 294 px). En-tête d’environ 280 px, bandeau d’information, puis fil `min-h-[280px] max-h-[52vh]`, puis zone de réponse **sous la ligne de flottaison**. Pour répondre, l’agent fait défiler la page et perd de vue les derniers messages.
- **Cause** : `src/routes/_auth/support_.$conversationId.tsx:414`, ajoutée à la hauteur de `DetailHeaderCard` (RSP-12).
- **Capture** : `resp-tall-support_52-360.png`.
- **Correctif** : sous `md`, mettre la carte « Fil de discussion » en `flex flex-col h-[calc(100dvh-72px-…)]` : fil `flex-1 overflow-y-auto`, zone de réponse collée en bas de la carte (`sticky bottom-0`). Réduire l’en-tête (RSP-12) et le bandeau (texte sur 1 ligne avec « En savoir plus »).

### RSP-20 ⚪ La table Clients défile même sur ordinateur

- **Page** : `/clients` à **1280** (954 px visibles pour 997 de table) : « Vérifications » est coupée à droite. À 768/1024, « Inscrit le » et « Vérifications » sont hors écran.
- **Cause** : largeurs max. des cellules Email/Adresse (`src/routes/_auth/clients.tsx:320,329`, `max-w-[220px]`/`[260px]`) ajoutées à 6 colonnes.
- **Capture** : `resp-clients-1280.png`, `resp-clients-768.png`.
- **Correctif** : priorités de colonnes (RSP-2) : Adresse en `hideBelow="xl"`, Inscrit le en `hideBelow="lg"`, et Email mis en sous-ligne du nom sous `lg`.

## 4. Produits IA

### RSP-21 🟡 Barèmes : les taux (la donnée de l’écran) sont hors écran

- **Page** : `/produits-ia/ia-standard/baremes`. À 360, seules les colonnes N°, Description (tronquée à environ 130 px) et Statut sont visibles, et les taux Décès / Invalidité / Frais méd. et les actions sont hors écran. À 768 et 1024, « Actions » est hors écran.
- **Cause** : 7 colonnes (880 px) et description `max-w-[150px]` (`src/components/ia-products/premium-rates/PremiumRatesScreen.tsx:231`).
- **Captures** : `resp-tall-produits-ia_ia-standard_baremes-360.png`, `resp-produits-ia_ia-standard_baremes-1024.png`.
- **Correctif** : sous `md`, une vue cartes par classe (N° + description sur 2 lignes, les 3 taux en grille 3 colonnes, menu d’actions `⋯`). Au-dessus, colonne Actions collée à droite (`sticky right-0 bg-card`). Même traitement pour Majorations (Type/Taux/Statut/Actions hors écran à 360).

### RSP-22 ⚪ Bande d’onglets IA Standard : l’onglet actif peut être invisible

- **Pages** : Prorata et Réglages à **360/390**. La bande défile bien (ombre de bord), mais s’ouvre toujours au début, donc l’onglet actif (« Prorata », « Réglages ») est hors écran. Les onglets font 28 px de haut (RSP-13).
- **Cause** : `src/routes/_auth/produits-ia.ia-standard.tsx:77-90` (pas de `scrollIntoView` sur l’onglet actif).
- **Captures** : `resp-produits-ia_ia-standard_reglages-360.png`, `resp-produits-ia_ia-standard_prorata-360.png`.
- **Correctif** : dans `ScrollShadow`, au montage et à chaque changement, faire défiler l’élément `[data-state=active]` / `[aria-current]` en vue (`scrollIntoView({inline:'center', block:'nearest'})`). Sinon, sous `sm`, remplacer la bande par un `Select` « Section ».

### RSP-23 ⚪ Barres d’outils qui ne contiennent qu’un bouton

- **Pages** : IA Pour Tous (« Nouvelle formule »), Prorata (« Ajouter une tranche »), à toutes les largeurs. Une carte blanche d’environ 60 px ne contient qu’un bouton aligné à droite, ce qui est visible surtout sur mobile.
- **Captures** : `resp-tall-produits-ia_ia-pour-tous-360.png`, `resp-tall-produits-ia_ia-standard_prorata-360.png`.
- **Correctif** : passer l’action principale dans `PageHeader action` (recette « List page » du registre). N’afficher `Toolbar` que s’il y a une recherche ou des filtres.

### RSP-24 ⚪ IA Pour Tous : colonnes à largeur minimale fixe

- **Page** : `/produits-ia/ia-pour-tous`, 360 à 1024. Table de 863 px : « Garanties » (4 lignes par formule) est coupée et « Primes » et « Actions » sont hors écran, y compris à 768 et 1024.
- **Cause** : `src/components/ia-products/formulas/FormulasScreen.tsx:192` (`min-w-[250px]`) et `:202` (`min-w-[260px]`).
- **Capture** : `resp-tall-produits-ia_ia-pour-tous-360.png`.
- **Correctif** : `md:min-w-[250px]` / `md:min-w-[260px]`, et une vue cartes sous `md` (libellé + interrupteur, puis garanties et primes en `InfoList`). Colonne Actions en `sticky right-0`.

## 5. Commissions

### RSP-25 🟡 Assistant de schéma : les étapes débordent à 360

- **Page** : `/commissions/schemes/new`, 360/390. Grille de 3 étapes fixes : le libellé « Répartition » sort de sa pastille et touche le bord de l’écran.
- **Cause** : `src/components/commissions/CommissionSchemeFormPage.tsx:418` (`grid grid-cols-3`, avec pastilles `px-3` + rond 20 px + libellé).
- **Captures** : `resp-commissions_schemes_new-360.png`, `resp-wiz-step2-360.png`, `resp-wiz-step3-360.png`.
- **Correctif** : sous `sm`, n’afficher le libellé que pour l’étape courante (les autres réduites au numéro), ou afficher un compteur « Étape 2 sur 3 · Niveau ». Le mieux est de porter ce rendu dans la primitive `Stepper` (`ui/Stepper.tsx`) et d’y faire passer cette liste.

### RSP-26 🟡 Assistant de schéma : la raison du blocage est écrasée entre les boutons

- **Page** : `/commissions/schemes/new`, étape 1 à 360. « Choisissez / un / partenaire / pour / continuer. » s’affiche un mot par ligne dans environ 50 px, entre « Précédent » et « Continuer ». À l’étape 3, le pied passe sur 2 lignes (« Précédent » puis « Enregistrer le schéma »).
- **Cause** : `src/components/commissions/CommissionSchemeFormPage.tsx:711-727` (`<p className="min-w-0 flex-1 text-right">` entre les deux boutons).
- **Captures** : `resp-tall-commissions_schemes_new-360.png`, `resp-wiz-step3-360.png`.
- **Correctif** : sous `sm`, raison en `order-first basis-full text-left` au-dessus des boutons, et boutons en `grid grid-cols-2`. Au-dessus de `sm`, garder la mise en page actuelle.

### RSP-27 🟡 Distributions : l’action « Rejouer » est hors écran

- **Page** : `/commissions/distributions`, à **360/390** (table de 644 px : Pot, Créée le, Statut, Action hors écran) et à **1024** (876 px pour 698 : Action hors écran). C’est la seule action de la ligne, et c’est la raison d’être de l’onglet « En attente ».
- **Cause** : 8 colonnes, sans priorité ni colonne d’action collante (voir RSP-2).
- **Captures** : `resp-tall-commissions_distributions-360.png`, `resp-commissions_distributions-1024.png`.
- **Correctif** : colonne Action `sticky right-0 bg-card` (avec ombre gauche), ou vue cartes sous `md` avec le bouton « Rejouer » en pied de carte. Masquer « Pot » et « Créée le » sous `lg`.

### RSP-28 ⚪ Relevé de portefeuille : plus de marge latérale entre 640 et environ 930 px

- **Page** : `/commissions/wallets` → « Voir le relevé », à **768** : le dialogue fait 768 px, collé aux deux bords. À 360, c’est correct (328 px, et la table défile dedans).
- **Cause** : `src/routes/_auth/commissions.wallets.tsx:495` (`sm:max-w-4xl` remplace le `max-w-[calc(100%-2rem)]` de base).
- **Capture** : `resp-int-wallet-releve-768.png`.
- **Correctif** : `sm:max-w-[min(56rem,calc(100%-2rem))]`. Mieux, ajouter une taille `wide` à un `DialogContent` partagé (comme `FormDialog size`), qui garde toujours la marge.

## 6. Partenaires, utilisateurs, rôles, permissions, profil, auth

### RSP-29 🟡 Permissions : colonne « Ce que ça autorise » réduite à environ 50 px

- **Page** : `/permissions`, 360/390. La 1ʳᵉ colonne fixée à 300 px ne laisse qu’environ 50 px visibles à la description : un mot par ligne (« Consulte / accesso / avec les… »), lignes de 80 à 100 px, 60 permissions sur 2 800 px. Le tiroir de permission sort de l’écran (RSP-1).
- **Cause** : `src/components/permissions/PermissionsTable.tsx:101` (`w-[300px]` sur la cellule).
- **Capture** : `resp-tall-permissions-360.png`.
- **Correctif** : `md:w-[300px]`. Sous `md`, masquer la 2ᵉ colonne et afficher la description sous le libellé (`TruncatedText lines={2}`). Supprimer la table au profit d’une liste est aussi possible, puisqu’il n’y a que 2 colonnes.

### RSP-30 ⚪ Rôles : « Accès accordés » hors écran, descriptions tronquées

- **Page** : `/roles`, 360/390 (table de 692 px pour 326). Le résumé des accès, qui est l’information de la ligne, est hors écran, et la description du rôle est tronquée sur 1 ligne.
- **Cause** : `src/components/roles/RolesTable.tsx:62` (`w-[110px]`) et `:117` (`max-w-[320px]`).
- **Capture** : `resp-tall-roles-360.png`.
- **Correctif** : sous `md`, afficher le compteur d’accès en sous-ligne du nom (« 51 accès ») et masquer la colonne (`hideBelow="md"`).

### RSP-31 ⚪ Pages d’authentification sur téléphone

- **Pages** : `/login`, `/forgot-password`, de 360 à 768. Le panneau de marque garde le logo et le copyright **au-dessus** du formulaire : le « © 2026 NSIA Assurances » flotte au milieu de l’écran, et le formulaire est poussé vers le bas. Le H1 est masqué sous `lg`, donc aucun titre de niveau 1 n’est visible.
- **Cause** : `src/components/auth/AuthShell.tsx:21` (`justify-between gap-10 p-8`), `:37` (`hidden lg:block` sur le H1), `:47` (copyright dans le panneau de marque).
- **Captures** : `resp-login-360.png`, `resp-login-768.png`, `resp-forgot-password-360.png`.
- **Correctif** : sous `lg`, logo en haut (`p-6`), formulaire juste en dessous, copyright en bas de page (`order-last`, sous la carte). Rendre le titre de la carte (`AuthHeading`) en `h1` sous `lg`, ou garder un H1 `sr-only`.

Le profil (`/profil`), les formulaires « Ajouter un partenaire » / « Ajouter un administrateur » et la fiche partenaire (hors RSP-2, RSP-3, RSP-5 et RSP-11) passent correctement à toutes les largeurs.

---

## Approche recommandée

Ordre conseillé : les primitives d’abord (une seule modification corrige 10 à 25 écrans), puis les cas propres à une page.

1. **Tiroirs et dialogues** (RSP-1, 7, 8, 28), à faire en premier, c’est le seul 🔴.
   - `ui/sheet.tsx` : prop `size`, `w-full` sous `sm`. Supprimer les 7 `w-[NNNpx]`.
   - `ui/dialog.tsx` : `max-h-[calc(100dvh-2rem)]`, et une taille `wide` qui garde la marge.
   - `FormDialog` : corps en `flex-1 min-h-0 overflow-y-auto`, pied en 2 colonnes sous `sm`.
   - `NotificationsMenu` : largeur `min(380px, 100vw - 1rem)`.

2. **Stratégie tables** (RSP-2, 3, 20, 21, 24, 27, 29, 30), dans `layout/DataTable.tsx` :
   - **Priorité de colonne** : `DataTableHead`/`DataTableCell` avec `hideBelow?: 'sm'|'md'|'lg'|'xl'` (→ `hidden md:table-cell`, ou `@md/main:table-cell` si l’on passe aux container queries, voir RSP-15). Chaque page déclare ce qui est secondaire (dates de création/mise à jour, email, adresse, « Émis par », « Pot »…).
   - **Identifiant collant** : `FIRST_CELL_CLASS` et `DataTableHead first` en `sticky left-0 z-[1] bg-card` (fond de ligne au survol inclus). La ligne reste lisible quand on fait défiler.
   - **Colonne d’action collante** : `DataTableHead action` / `RowActionsCell` en `sticky right-0` avec une ombre à gauche (Barèmes, Majorations, Accessoires, IA Pour Tous, Schémas, Distributions).
   - **Vue cartes sous `md`** pour les listes à fort trafic où la ligne ouvre un détail : Sinistres, Clients, Cotations, Support, Partenaires, Administrateurs. Il faut une primitive `ResponsiveList`, ou une prop `mobileCard={(row) => …}` sur `DataTableCard` qui rend une `<ul>` de cartes `ClickableRow`-like (nom + sous-ligne, pastille de statut, montant à droite, chevron). Mêmes 4 états (chargement, vide, erreur, 403). Pour les tables d’administration (IA, commissions, IAM), les priorités de colonnes et les colonnes collantes suffisent.
   - **États vides et erreurs** rendus hors de la zone défilable (ou `sticky left-0` à la largeur visible).

3. **Primitives de page** (RSP-4, 5, 6, 9, 10, 11, 12, 13, 14) :
   - `KpiCard` variante compacte sous `sm` et valeur adaptative avec unité séparée ; `KpiRow cols=3` en `grid-cols-2 sm:grid-cols-3`.
   - `Toolbar` en grille à 2 colonnes, contrôles `w-full` sous `sm`, `ToolbarSearch min-w-0 sm:min-w-[240px]` ; prop `fluid` sur `SearchableSelect`/`FilterSelect` ; `DateRangeFilter` partagé.
   - `ResultCount` en flex-wrap ; `SectionCard` avec en-tête en flex-wrap et `px-4 sm:px-6` ; `InfoList` en `sm:grid-cols-2` ; `DetailHeaderCard` empilé sous `sm`.
   - Cibles de 36 px pour onglets, liens d’action et interrupteurs. `ScrollShadow` fait défiler l’élément actif en vue.
   - Squelettes de détail via `KpiRow` (un `DetailSkeleton` partagé).

4. **Largeur utile plutôt que viewport** (RSP-15) : déclarer `@container/main` dans `AppShell` et exprimer les règles des primitives (`KpiRow`, `hideBelow`, `Toolbar`) en variantes `@…/main:`. C’est ce qui règle le cas 1024 px (menu visible, 700 px de contenu) sans toucher à la structure du menu.

5. **Cas propres à une page** : graphique (RSP-16), plage de dates Cotations (RSP-18), fil de discussion support (RSP-19), onglets IA (RSP-22), barres d’outils à un seul bouton (RSP-23), étapes et pied de l’assistant de schéma (RSP-25, 26 ; la solution va dans `Stepper`), auth (RSP-31).

6. **Registre UI** : après correction, documenter dans `context/project/ui-registry.md`, à mettre à jour avec les correctifs :
   - § 2 : `SheetContent size`, `hideBelow`, colonnes collantes, `mobileCard`, `DateRangeFilter`, KPI compact ;
   - § 6 « Responsive » : largeurs de référence 360 / 768 / 1024 et container queries ;
   - § 8 : règle « jamais de `w-[NNNpx]` sans breakpoint sur un conteneur de premier niveau (tiroir, dialogue, menu, cellule `min-w`) ».

   Garder ensuite un balayage Playwright à 360 / 768 / 1024 (script `resp-sweep.mjs` du dossier de démo) comme contrôle avant livraison.
