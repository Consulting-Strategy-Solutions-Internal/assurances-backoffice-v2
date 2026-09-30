# UI registry — NSIA back-office

Source of truth for the look of every page. The reference implementation is the **Clients** pages
(`src/routes/_auth/clients.tsx`, `clients_.$clientId.tsx`). Follow this file; do not invent new card,
table, header or empty-state markup. If a primitive is missing something, extend the primitive.

## 1. Tokens

Defined in `src/styles.css` (shadcn tokens remapped to the NSIA palette). Use the Tailwind token
(`bg-primary`, `text-muted-foreground`, `border-border`) whenever one exists.

| Purpose                        | Value                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Page background `--background` | `#f3f5f9`                                                                               |
| Card `--card`                  | `#ffffff`, border `--border` `#ebeef3`, `shadow-sm`                                     |
| Text `--foreground` / muted    | `#0f1b33` / `#5b6577` (`text-muted-foreground`, AA ≥ 4,5:1 on card and page background) |
| Brand `--primary`              | `#00337f` (focus ring = same, `ring-ring/50`, 3px)                                      |
| Gold accent                    | `#ffc61e` (`nsia-gold`), text on gold `#8a6600`                                         |
| Destructive                    | `#cf3d3d`                                                                               |
| Font                           | Plus Jakarta Sans                                                                       |

**Semantic tints** (pills, icon tiles, avatars). Same four hues everywhere:

| Tone    | bg / text             | Meaning                   |
| ------- | --------------------- | ------------------------- |
| success | `#e7f6ee` / `#167347` | active, verified, settled |
| warning | `#fef3da` / `#8a6600` | pending, attention        |
| info    | `#e7eefb` / `#1f53b0` | new, informational        |
| danger  | `#fbe9e9` / `#c0392b` | rejected, suspended       |
| neutral | `#f0f1f4` / `#5b6577` | inactive, unknown         |

**Contrast rule (AA)**: text on a tint must reach 4,5:1 — use only the text colours above (they were darkened on 2026-09-30: `#167347`, `#8a6600`, `#5b6577`; `#c0392b` for danger). Never use `#1c8a57` / `#9a7400` / `#6b7585` as _text_ colours (fine as icon strokes or fills).

Use `PILL_TONES` / `PillTone` from `#/lib/dashboard-theme` (or `<StatusPill tone=…>`); never re-type hex in pages except in `KpiCard` icon tiles (below).

**Radii**: cards `rounded-xl` (Card default) — KPI cards `rounded-2xl` — inputs/selects/filters
`rounded-[10px]` — buttons in headers/dialogs/toolbars `rounded-[11px]` — pills `rounded-full`/badge default.
**Shadows**: cards `shadow-sm`; primary CTA `shadow-[0_4px_14px_rgba(0,51,127,0.22)]` (PageHeader/FormDialog already apply it).

**Type scale** (all pages):

| Use                        | Classes                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| Page title (H1)            | `text-[26px] font-extrabold tracking-[-0.03em]` (PageHeader / DetailHeaderCard) |
| Section title              | `text-[16px] font-bold tracking-[-0.01em]` (SectionCard)                        |
| KPI value                  | `text-[30px] font-extrabold tracking-[-0.035em]`                                |
| Body / cell                | 14px (`text-sm`), values in InfoRow `text-[13.5px] font-semibold`               |
| Secondary / helper         | `text-[13px] text-muted-foreground`; labels `text-[12.5px]`                     |
| Table header               | `text-[11.5px] font-bold uppercase tracking-[0.05em]` (DataTableHead)           |
| Eyebrow (dialogs, drawers) | `text-[11.5px] font-bold tracking-[0.06em] uppercase text-muted-foreground`     |

**Layout**: content column `max-w-[1360px]`, `px-4 md:px-[34px]`, vertical rhythm `mb-[18px]` between blocks, `gap-4` in grids.

## 2. Primitives

All in `src/components/layout/` unless noted. Import with `#/components/layout/<File>`.

### PageHeader (`#/components/dashboard/PageHeader`)

Title row of every list/settings page. Props: `title`, `subtitle?`, `action?` (label of the primary
button), `actionIcon?` (default `Plus`), `onAction`, `actionDisabled`, `actionTitle`, `children` (extra buttons, left of the primary).

```tsx
<PageHeader
  title="Partenaires"
  subtitle="Distributeurs, agences et agents."
  action="Ajouter un partenaire"
  onAction={open}
/>
```

Detail pages do **not** use PageHeader (they use BackLink + DetailHeaderCard).

### KpiCard (`#/components/dashboard/KpiCard`) + KpiRow

`KpiCard` props: `icon`, `iconClass` (tile bg), `value`, `label`, `trend?`, `variant?: 'light'|'dark'`.
`KpiRow` props: `cols?: 3|4` (default 4), `className?` — the responsive grid (2 cols mobile, 4 on xl / 3 on sm).
Icon recipe (size-5 icon in the tile):

| Tone    | `icon` class     | `iconClass`         |
| ------- | ---------------- | ------------------- |
| brand   | `text-primary`   | `bg-primary/[0.08]` |
| success | `text-[#167347]` | `bg-[#1c8a57]/10`   |
| info    | `text-[#1f53b0]` | `bg-[#1f53b0]/10`   |
| warning | `text-[#8a6600]` | `bg-[#ffc61e]/20`   |

```tsx
<KpiRow>
  <KpiCard
    icon={<Users className="size-5 text-primary" />}
    iconClass="bg-primary/[0.08]"
    value={isLoading ? '…' : total}
    label="Clients"
  />
</KpiRow>
```

While loading show `'…'` as value; on error show `'—'`. Use `cols={3}` for detail pages (add `className="mb-0"` when inside a `gap-[18px]` flex column).

### EntityAvatar (`EntityAvatar.tsx`)

Initials avatar. Props: `name?` (initials derived), `initials?`, `tone?` (`brand|pink|blue|green|gold|violet|gray`), `seed?` (stable colour from a string; default = `name`), `className?` (size; default `size-9`, hero `size-[72px] text-2xl`). Helpers `initialsOf(name)`, `toneFromSeed(seed)`.
`ClientAvatar` (`components/clients`) is a thin wrapper (tone by gender). For partners/agents/users just use `<EntityAvatar name={p.name} />`.

### SegmentedPills (`SegmentedPills.tsx`)

2–4 exclusive filter options: `<SegmentedPills label="Statut" value={v} onChange={setV} options={[{value:'all',label:'Tous'},…]} />`. More options → shadcn `Select` with `className="h-10 w-[170px] rounded-[10px] bg-card"`.

### Toolbar / ToolbarSearch / ResultCount (`Toolbar.tsx`)

Card above a table. `Toolbar` props: `search?`, `filters?`, `actions?` (right-aligned via `ml-auto`), `className?`.
`ToolbarSearch`: `value`, `onChange(string)`, `placeholder`, `label` (aria). `ResultCount`: children = « 12 partenaires » (« 3 sur 12 » when filtered), `note?` = warning text right-aligned.

```tsx
<Toolbar search={<ToolbarSearch label="Rechercher un partenaire" placeholder="Rechercher par nom, code…" value={q} onChange={setQ} />}
         filters={<SegmentedPills … />} actions={<Button variant="outline">Exporter</Button>} />
<ResultCount>{isLoading ? 'Chargement…' : `${rows.length} partenaire${rows.length > 1 ? 's' : ''}`}</ResultCount>
```

Client-side filtering: normalise with `normalizeText` from `#/lib/clients`. Reset filters via the empty state action.

### DataTableCard & friends (`DataTable.tsx`)

- `DataTableCard` — Card `gap-0 overflow-x-auto py-0` wrapping the shadcn `<Table>`.
- `DataTableHead` (`first?`) — standard header cell (grey bg, uppercase). First column: `first`; chevron column: `className="w-10"`.
- `FIRST_CELL_CLASS` — `pl-[22px]` for the first body cell.
- `ClickableRow` (`onActivate`, `selected?`) — row that navigates/opens on click, Enter, Space (role=button, tabIndex 0, hover + focus ring). End with `<RowChevron />` (sticky right). **Selected row** (detail drawer open): pass `selected`, never a `bg-primary/5` class — the row gets `data-selected` and `styles.css` gives its sticky cells (first column, chevron) the opaque equivalent `color-mix(in srgb, var(--primary) 5%, var(--card))`; hover/focus use `#f6f8fc` on them the same way. Use only if the row goes somewhere; otherwise plain `TableRow className="hover:bg-[#f6f8fc]"`.
- `TableSkeletonRows` (`columns: number[]` widths in quarter-px units, `rows=8`, `leading='avatar'|'text'`, `trailing`) — loading rows.
- `TableEmptyState` (`colSpan`, `icon?`, `title`, `description?`, `action?`) and `TableErrorState` (`colSpan`, `title?`, `description?`, `forbidden?`, `action?`).

```tsx
<DataTableCard>
  <Table>
    <TableHeader><TableRow className="hover:bg-transparent"><DataTableHead first>Nom</DataTableHead><DataTableHead>Code</DataTableHead><DataTableHead className="w-10" /></TableRow></TableHeader>
    <TableBody>
      {isLoading ? <TableSkeletonRows columns={[36, 20]} trailing />
       : error ? <TableErrorState colSpan={3} forbidden={isForbidden(error)} title="Impossible de charger les partenaires." />
       : rows.length === 0 ? <TableEmptyState colSpan={3} icon={Share2} title="Aucun partenaire pour le moment." action={<Button>…</Button>} />
       : rows.map(r => (<ClickableRow key={r.id} onActivate={() => go(r)}><TableCell className={FIRST_CELL_CLASS}>{r.name}</TableCell><TableCell>{r.code}</TableCell><RowChevron /></ClickableRow>))}
    </TableBody>
  </Table>
</DataTableCard>
<Pagination … />
```

`Pagination` (`#/components/ui/Pagination`) goes right after the card (hides itself when 1 page).
Cell conventions: primary cell = `font-semibold` name + `text-[12px] text-muted-foreground` sub-line; numbers `tabular-nums whitespace-nowrap`; secondary text `text-muted-foreground`; empty → `<span className="text-muted-foreground">—</span>`.

### EmptyState (`EmptyState.tsx`)

Props: `icon?`, `title`, `description?`, `action?`, `tone?: 'muted'|'error'`, `variant?: 'plain'|'card'`. `plain` inside a card/SectionCard body; `card` for a full page state (404, invalid id, 403).

### BackLink (`BackLink.tsx`)

Typed like `Link` (`to`, `params`, `search`); children = « Retour aux clients ». First element of a detail page.

### DetailHeaderCard (+ `IconTile`) (`DetailHeaderCard.tsx`)

Props: `leading?` (EntityAvatar `size-[72px] text-2xl` or `<IconTile><Icon/></IconTile>`), `title`, `meta?` (muted line, « · » separated), `pills?` (StatusPill/Badge), `actions?` (outline secondary buttons + one primary; all `rounded-[11px]`).

### SectionCard (`SectionCard.tsx`)

Titled card with **padded body** — use it for every block on detail/settings pages; never put content in a bare `<Card>` (no horizontal padding). Props: `title?`, `description?`, `action?`, `flush?` (no body padding, header gets a bottom border — for tables/lists), `className?`, `bodyClassName?`.

```tsx
<SectionCard title="Coordonnées" description="…" action={<Button size="sm" variant="outline">Modifier</Button>}>…</SectionCard>
<SectionCard flush title="Agences"><Table>…</Table></SectionCard>
```

Two columns of cards: `<div className="grid gap-[18px] lg:grid-cols-2">`.

### InfoList / InfoRow (`InfoList.tsx`)

`InfoList` (`columns?: 1|2`) wraps `InfoRow` (`icon?`, `label`, `placeholder?` default « — », children = value). Empty children (`null`/`undefined`/`''`) render the muted placeholder — pass `placeholder="Non renseigné(e)"` when the meaning is « missing ».

### StatusPill (`#/components/dashboard/StatusPill`)

`<StatusPill status="Actif" />` (colour by known label) or `<StatusPill tone="success">Téléphone vérifié</StatusPill>`. Domain badges (ClaimStatusBadge, QuotationStatusBadge…) stay as they are.

### Responsive primitives (wave 1 of `feat/responsive`)

Breakpoints of the layout primitives follow the **content column** (`@container/main`, declared by `AppShell`, `AuthShell`, `DialogContent` and `SheetContent`), not the viewport. Thresholds in content px: `sm` 576 · `md` 672 · `lg` 896 · `xl` 1024 (`@xl/main` · `@2xl/main` · `@4xl/main` · `@5xl/main`). Outside any of these containers a `@…/main:` class simply does not match (the narrow layout applies).

**`SheetContent size`** (`ui/sheet.tsx`): `'sm'|'md'|'lg'` = 430 / 480 / 520 px, always full width below `sm`. No `size` = historic `w-3/4 sm:max-w-sm`. Never write `w-[NNNpx]` on a drawer. Header/footer stay pinned when the body is `flex-1 overflow-y-auto` (`gap-0 p-0` on the content).

```tsx
<SheetContent side="right" size="md" showCloseButton={false} className="gap-0 p-0">
```

**`DialogContent size`** (`ui/dialog.tsx`): `'default'` 32 rem · `'wide'` 760 px · `'xl'` 56 rem — all keep a 1 rem side margin (`min(…, 100% - 2rem)`); the dialog is capped at `100dvh - 2rem` and scrolls. `FormDialog size="wide"` uses it; its body scrolls between a pinned header and footer (footer = 2 columns below `sm`). Same cap on `AlertDialogContent`.

**DataTable** (`layout/DataTable.tsx`)

- `DataTableHead` / `DataTableCell` (new) props: `hideBelow?: 'sm'|'md'|'lg'|'xl'`, `sticky?: 'left'|'right'`, `first?`. Give head and cells of a column the same `hideBelow`. `hideBelowClass(b)` / `stickyCellClass(side)` for raw `TableCell`s; `TableSkeletonRows hideBelow={[undefined,'md',…]}` aligns the skeleton.
- `sticky="left"` on the identifier column, `sticky="right"` on the action column (edge shadow only while the table scrolls, row hover colour kept via `data-sticky`).
- `TableEmptyState` / `TableErrorState` centre themselves on the visible width (no more clipped text).
- `DataTableCard mobileCards={…}`: below 672 px of content the table card is hidden and the node is shown instead — use `MobileCardList` (`layout/MobileCardList.tsx`) with `MobileCardContent`.

```tsx
<DataTableCard
  mobileCards={
    <MobileCardList
      items={rows} getKey={(r) => r.id} onActivate={(r) => open(r.id)}
      isLoading={isLoading} error={!!error} forbidden={isForbidden(error)}
      errorTitle="Impossible de charger les clients."
      empty={{ icon: Users, title: 'Aucun client pour le moment.' }}
      renderCard={(r) => <MobileCardContent leading={<EntityAvatar name={r.name} />} title={r.name} subtitle={r.email} status={<StatusPill status={r.status} />} value={formatFcfa(r.total)} />}
    />
  }
>
  <Table>… <DataTableHead first sticky="left">Nom</DataTableHead><DataTableHead hideBelow="md">Créé le</DataTableHead><DataTableHead sticky="right" /> …
    <DataTableCell first sticky="left">…</DataTableCell><DataTableCell hideBelow="md">…</DataTableCell></Table>
</DataTableCard>
```

**KpiCard / KpiRow**: `KpiCard` has a compact row layout (icon left, value + label right) below 576 px of content and the stacked card above; new `unit?: string` (small, next to the value: `value="75 805" unit="FCFA"`); value `text-[24px] → 30px`; `min-w-0`. `KpiRow cols={4}`: 2 columns then 4 from 896 px; `cols={3}`: 2 columns on phones (3rd card spans both), 3 from 576 px. `KPI_ROW_CLASS` is exported for skeletons.

**Toolbar**: below 576 px a 2-column grid (search, `SegmentedPills`, `DateRangeFilter` and the actions span both; selects fill one cell — direct children get `w-full!` automatically). `ToolbarSearch` is `min-w-0` then `min-w-[240px]`. `fluid` on `SearchableSelect` / `claims/FilterSelect` (full width below 576 px) for use outside a Toolbar direct-child position. `ResultCount` wraps (note on its own line on phones).

**DateRangeFilter** (`layout/DateRangeFilter.tsx`), built on `quotations/FrDateInput`:

```tsx
<DateRangeFilter idPrefix="cot" from={search.from} to={search.to}
  onFromChange={(from) => setFilters({ from })} onToChange={(to) => setFilters({ to })} />
```

**SectionCard**: header wraps (title `basis-48`, action drops to the next line when short of room), `px-4 sm:px-6`. **InfoList** `columns={2}`: two columns only when the list is ≥ 384 px wide (container query on the list itself, so a drawer or a half-width card stays on one column). **DetailHeaderCard**: `p-4 sm:p-6`, avatar/icon 56 px stacked above the title below `sm`, H1 22 → 26 px, actions full width.

**Touch targets 36 px**: `TabsTrigger` `min-h-9`; `ACTION_LINK_CLASS` (`#/lib/dashboard-theme`) for text links/buttons like « Tout voir → » (`-mx-2 min-h-9 px-2`); `AUTH_LINK_CLASS` is `min-h-9`; `ia-products/shared/Switch` has a 52×36 hit area.

**ScrollShadow** scrolls the active item (`[data-state=active]`, `[aria-current]`) into view on mount and when it changes (`scrollActiveIntoView`, `scrollDeltaToReveal`). **DetailSkeleton** (`layout/DetailSkeleton.tsx`, `kpis={3|4|0}`): loading state of every detail page, its KPI grid is the real `KpiRow`. **Stepper**: below `sm`, « Étape n sur N · label » + progress bar (the bars become 36 px buttons when `onStepClick` is given); full step list from `sm`; the current step carries `aria-current="step"` in both modes.

**Header action slot** (`ia-products/shared/header-action.tsx`, may be promoted to `layout/` later): `<HeaderActionSlot />` goes in `children` of `PageHeader`; the screen (which owns its dialog state) renders its primary buttons with `<HeaderActionPortal>…</HeaderActionPortal>`, which portals them into the slot (without a slot — tests, isolated use — it renders them inline, right-aligned). Replaces a one-button toolbar.

**CardActionsMenu** (`ia-products/shared/CardActionsMenu.tsx`, may be promoted to `layout/` later): « ⋯ » dropdown (36 px) for mobile cards, where the table's icon actions have no room. Props: `label` (accessible name, e.g. « Actions de la classe 3 »), `actions: {label, icon?, onSelect, destructive?}[]`, `disabled?`, `title?` (missing-permission tooltip).

**Sticky and container rules**

- Two sticky columns (`left` + `right`) must fit together in the narrowest visible width (≈ 326 px at 360, keep ≥ 150 px free) — else the middle columns can never scroll into view (L-007). If they don't, pass `stickyFrom="sm"` on one side (`<DataTableHead sticky="left" stickyFrom="sm">` + same on its cells: sticks only from 576 px of content), or use cards. A single sticky column wider than ~180 px at 360 gets `stickyFrom="sm"` too.
- `hideBelow` names (`sm|md|lg|xl`) are **content** thresholds 576 / 672 / 896 / 1024 px, not viewport breakpoints; pick one from the table's measured natural width (Playwright sweep), never by guess (L-008).
- No inline `position: fixed` inside a `@container` element (dialog, sheet, `main`, auth shell): a container with `container-type` becomes the containing block of `fixed` descendants. Portal it out or use `sticky`.

### Existing, unchanged

`ConfirmDialog` (destructive confirmations, `destructive` prop, `pending`), `FormDialog` (modal forms: eyebrow + title + description, Annuler + submit), `FormField`/`FormSelect`, `Sheet` drawers (`DetailDrawer` pattern, right side, header `border-b p-[26px] py-[22px]`), `Stepper`, `Skeleton` (`bg-[#e9ecf2]`, `animate-pulse`), `Pagination`.

## 3. Page recipes

**List page**

```
<PageHeader title subtitle action? />
<KpiRow>? …
<Toolbar search filters actions? />
<ResultCount>
<DataTableCard> Table with the 4 states </DataTableCard>
<Pagination />
```

Row opens detail → `ClickableRow` + `RowChevron`. Row opens a drawer → `ClickableRow` `onActivate={() => setSelected(id)}`.

**Detail page** (`flex flex-col gap-[18px]`)

```
<BackLink to="/x" search={…}>Retour aux x</BackLink>
<DetailHeaderCard leading title meta pills actions />
<KpiRow cols={3} className="mb-0">…
<div className="grid gap-[18px] lg:grid-cols-2"><SectionCard title>InfoList</SectionCard>…</div>
<SectionCard flush title action>table / EmptyState</SectionCard>
```

Loading: `Skeleton h-36 rounded-xl` + 3× `h-[122px] rounded-2xl` + `h-64 rounded-xl`. Not found / invalid id / error: `EmptyState variant="card"` with a BackLink-like button.

**Settings / form page**: `PageHeader` + stacked `SectionCard`s (max `max-w-3xl` for forms), fields via `FormField` (`h-10 rounded-[10px]`), footer buttons right-aligned inside the card (`Annuler` outline + primary `rounded-[11px]`). Inline banner for warnings: rounded-lg, `bg-[#fef3da] text-[#8a6600]` (see `ia-products/shared/WarningBanner`). Success feedback = `toast` (sonner).

**Drawers & dialogs**: create/edit forms → `FormDialog` (short) or right `Sheet` (permission/role style, with tabs/sections); destructive → `ConfirmDialog` with `destructive`. Titles: sentence case verb + object (« Ajouter un partenaire »); eyebrow = category in caps-by-CSS.

## 4. Copy rules

- French, sentence case, « ’ » typographic apostrophe in new strings, « … » single character; buttons = verb infinitive (« Ajouter », « Enregistrer », « Se déconnecter »); no exclamation marks.
- Empty value → `—` (muted). « Non renseigné(e) » only inside InfoRow where the field exists but is unset.
- Dates: `formatClaimDate(value, withTime?)` from `#/lib/claims` (« 03 sept. 2026 »). Never `toLocaleDateString` inline.
- Money: `formatFcfa(value)` from `#/lib/utils`. Percent/permille: `formatPercent`, `formatPermille` from `#/lib/format`.
- Phones: `formatPhone(raw)` from `#/lib/clients`, wrapped in `tabular-nums whitespace-nowrap`. Names in ALL CAPS: `clientFullName`-style cleaning.
- Counts: « 1 client » / « 2 clients »; filtered « 3 clients sur 15 ».
- IDs: « Client #106 », always muted.

## 5. States

| State   | Pattern                                                                                                                                                                                                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading | Skeletons shaped like the content (`TableSkeletonRows`, KPI value `'…'`, detail skeleton). Never a lone spinner or « Chargement… » except in `ResultCount`.                                                                                                                      |
| Empty   | `TableEmptyState` / `EmptyState`: icon + sentence ending with « . » (« Aucun partenaire pour le moment. ») + action to create when the user can. Filtered-empty: « Aucun … ne correspond à votre recherche. » + « Réinitialiser les filtres » link.                              |
| Error   | `TableErrorState` / `EmptyState tone="error"`: « Impossible de charger … » + hint. Add a « Réessayer » action (`refetch`) where cheap.                                                                                                                                           |
| 403     | `forbidden` (`TableErrorState`) → « Accès refusé. » + « Vous n’avez pas les droits nécessaires… ». Detect with `mapClaimError(error).kind === 'forbidden'` (`#/lib/claims`). Disable (with `title` tooltip) create buttons the user cannot use instead of hiding the whole page. |
| 404     | `EmptyState variant="card"` « … introuvable » + back button.                                                                                                                                                                                                                     |

## 6. Shell

- Sidebar (`components/dashboard/Sidebar.tsx`): w-64, white, `border-sidebar-border`; section labels uppercase 10.5px; active item `bg-primary/[0.07] text-primary font-semibold` with `aria-current="page"`; nav area scrolls, account menu pinned at bottom. **Menu structure is fixed** (do not add/remove entries).
- Topbar: sticky, blurred; menu button (below `lg`) + **global search** (`GlobalSearch`) + notifications. No period selector (the `period` state stays in `useShell()` for the dashboard, which shows its own control in the page). `useShell().search` **no longer exists**: every page keeps its own `ToolbarSearch`; never read a global query.
- Responsive: below `lg` the sidebar is an off-canvas `Sheet` (opened by the Topbar menu button, closes on navigation); its groups open when the current path is inside them. `AppShell` (`components/dashboard/AppShell.tsx`) is the authenticated layout, also used by the 404/error fallbacks.
- Skip-link « Aller au contenu » → `#main`; every route sets its tab title with `head: pageHead('Clients')` (`#/lib/page-title`) → « Clients · NSIA Back-office ».
- 404 / uncaught errors: `NotFoundPage` / `RouteErrorPage` (`layout/RouteFallbacks.tsx`, `EmptyState variant="card"`) — inside the shell when signed in. For an in-page « not found » use `EmptyState variant="card"` as before.
- Auth pages: `AuthShell` + `AuthCard` + `AuthHeading` + `AUTH_LINK_CLASS` (`components/auth/AuthShell.tsx`).

### Responsive (feat/responsive)

- **Reference widths**: 360 (small phone) · 390 · 768 (tablet) · 1024 (laptop **with the menu open = 700 px of content**) · 1280. Nothing scrolls horizontally at the page level; wide tables scroll inside their card. Check 360 / 768 / 1024 before delivering a page (`resp-sweep.mjs`).
- **Container queries, not viewport**: layout primitives use `@xl/main:` · `@2xl/main:` · `@4xl/main:` · `@5xl/main:` (576 / 672 / 896 / 1024 px of content) and `@max-xl/main:` for « below ». Write the class literally (`@2xl/main:table-cell`), never interpolated. In a page, use them (or the primitives) instead of `md:`/`lg:` whenever the rule depends on the space the content has, since the menu takes 256 px from `lg` up. Viewport variants stay right for things that depend on the device (drawer width, `sm:` paddings).
- **Drawers**: `SheetContent size="sm|md|lg"` (430/480/520), full screen on phones. **Dialogs**: `DialogContent size`, `FormDialog size="wide"`; height capped at `100dvh - 2rem`, body scrolls, header/footer pinned.
- **Tables**: columns have a priority (`hideBelow`); the identifier column is `sticky="left"` and the action column `sticky="right"` when the table can still scroll; lists that open a detail (Sinistres, Clients, Cotations, Support, Partenaires, Administrateurs) also give `mobileCards` (cards below 672 px). Administration tables (IA, commissions, IAM) rely on priorities + sticky columns. Empty/error states use `TableEmptyState`/`TableErrorState` (visible-width centred) — never a hand-made row.
- **Page blocks**: KPI = `KpiRow`/`KpiCard` (compact on phones), filters = `Toolbar` (2-column grid), dates = `DateRangeFilter`, loading of a detail page = `DetailSkeleton`. Touch targets ≥ 36 px.

## 7. Testing notes

Tests that mock `@tanstack/react-router` must provide `Link` (BackLink uses it) — `createLink` is not used. ESLint gotchas: see `context/memory.md`.

### SearchableSelect (`src/components/layout/SearchableSelect.tsx`)

Filtre de toolbar **avec recherche** (combobox) — à préférer à `ToolbarSelect` dès que la liste peut dépasser ~8 entrées (partenaires, agences, agents, clients…). Même contrat : `value === ''` = « aucun filtre » (`allLabel`). Recherche insensible aux accents/casse, sur `label` + `hint` (mettre le code distributeur, la ville…), tous les mots doivent correspondre. Clavier : ↑/↓, Entrée, Échap ; bouton « × » pour effacer.

```tsx
<SearchableSelect
  label="Partenaire"
  value={partnerId}
  onChange={setPartnerId}
  allLabel="Tous les partenaires"
  placeholder="Nom ou code distributeur…"
  options={partners.map((p) => ({
    value: String(p.id),
    label: p.name,
    hint: `Code ${p.distributorCode}`,
  }))}
/>
```

### KpiCard `hoverHighlight`

Au survol, la carte se soulève de 4 px et sa bordure/ombre s'accentuent (0,5 s, ease-out) — **pas de changement de couleur** (le fond bleu au survol a été refusé par l'utilisateur : trop agressif). Utilisé sur toutes les cartes du tableau de bord ; aucune carte n'est mise en avant en permanence.

## 8. Shared primitives added by the UX-fixes wave 1 (2026-09-30)

### Global search (`src/components/search/`)

Topbar combobox, **the only global search**. Ctrl/⌘+K focuses it; ↑/↓, Entrée, Échap; cleared on every navigation. Groups (order): Pages, Clients, Sinistres, Tickets support, Partenaires, Administrateurs, Métiers IA — ≤ 5 records per group + « Voir tous les … » link. Datasets are loaded whole with `fetchAllPages` (cached 5 min under `['global-search', …]`, only once the user types, skipped when `usePermissions().can(...)` says no); occupations use `GET /ia-standard/occupations/search` (≥ 2 chars). Logic is pure and tested in `search-logic.ts`. **To add a page to the search**: add an entry (`title`, `section`, `to`, `keywords` without accents) to `PAGES`. **To add a record type**: add a `searchXxx(items, query)` in `search-logic.ts`, a section in `use-global-search.ts`, a `GROUP_LABELS` / `GROUP_ORDER` / `SEE_ALL` entry and an icon in `GlobalSearch.tsx`. Deep link to a class drawer: `/produits-ia/ia-standard/classes?classId=14` (`RiskClassesScreen` `initialClassId`). Matching helpers (accent/case-insensitive, all words): `normalizeSearch`, `matchesWords`, `filterOptions` in `#/lib/search`.

### Unsaved-changes guard (`components/forms/unsaved-changes.tsx`)

- `FormDialog` prop `dirty` (all current usages wired with `useStore(form.store, s => !s.isDefaultValue)`, or `file !== null` for CSV dialogs): overlay / Échap / Annuler / × ask « Abandonner les modifications ? » (ConfirmDialog). Any **new** `FormDialog` must pass `dirty`.
- `useConfirmDiscard(dirty)` → `{ requestClose(fn), dialog }` for drawers (`Sheet`) and inline editors: `onOpenChange={(o) => !o && requestClose(onClose)}` and render `{dialog}` **inside** the Sheet/Dialog content (rendered outside, Radix treats the confirm click as an outside click and reopens it).
- `useUnsavedChangesGuard(dirty)` → `{ dialog, blocked }` for pages/wizards: `useBlocker` (in-app navigation) + `beforeunload`. Reset the form (`form.reset()`) before navigating after a successful save.

### TruncatedText (`layout/TruncatedText.tsx`)

`<TruncatedText lines={1|2|3} className="max-w-[240px]">{text}</TruncatedText>` — ellipsis + native `title` with the full text. Use for any user/backend text in a table cell or card that may be long (names, descriptions, subjects, emails). The parent must bound the width (`min-w-0` / `max-w-*`).

### formatPersonName / personInitials (`#/lib/people`)

`formatPersonName(first, last?)` (variadic, ignores empty parts): trims, collapses spaces, all-caps words → Title Case (`NIAMIEN ` + `ABOU` → « Niamien Abou »; `JEAN-PAUL` → « Jean-Paul »; `N'GUESSAN` → « N'Guessan »), particles (de, du, van, von, der…) stay lower case after the first word, mixed-case words and initials untouched. **Every displayed person name goes through it** (`clientFullName` already does). `personInitials(name)`.

### Backend text translation (`#/lib/backend-messages`)

`translateBackendMessage(msg)` maps known English backend messages (holdReason, 4xx bodies, CSV row errors — regexes with captures for « product not found for productCode: N ») to French, unknown ones unchanged; `apiErrorMessage` already uses it. `translateRoleDescription(desc)` for `GET /roles` descriptions. **Any backend string shown as-is must go through one of them** (holdReason, `RowError.message`, role description). New backend messages → add to `EXACT` / `PATTERNS`. `permission-labels.ts` covers all 60 backend permissions; add new resources there.

### SearchableSelect additions

`loading` (« Chargement… » row), `onSearch(query)` (server search: debounced 250 ms, called with `''` on open; local filtering is then skipped — `options` must be the server results; pair with `selectedLabel` so the selected value keeps its label when it is not in the current results), `disabledHint` (tooltip + small text under the disabled control: say _why_ and what to do).

### FormField additions

`autoComplete`, `revealable` (password show/hide button, « Afficher/Masquer le mot de passe »). Set `autoComplete` on every login/profile/password field (`username`, `current-password`, `new-password`, `email`).

### Money, dates, sizes

- `formatFcfa(n)` → « 10 008 FCFA »: **no decimals**, thousands separated by U+00A0 (also before « FCFA »), never wraps; add `tabular-nums` on numeric cells. `formatNumber(n)` for the bare grouped integer. Values sent to the API stay exact.
- Minimum touch target **36 px**: `Button` `size="sm"` is `h-9`, `icon-sm` is `size-9`, `SegmentedPills` buttons `min-h-9`. Do not add `size-7`/`size-8` icon buttons.
- Horizontal overflow hints: `DataTableCard` shows edge shadows when the table scrolls; wrap tab strips in `<ScrollShadow>` (`layout/ScrollShadow.tsx`).
- Radix Dialog/Sheet close labels are French (« Fermer »).

### Responsive rule (2026-09-30)

- **No top-level `w-[NNNpx]` / `min-w-[NNNpx]` without a breakpoint** on a drawer, dialog, popover/menu, toolbar control or table cell: use `SheetContent size`, `DialogContent size`, `w-[min(380px,calc(100vw-1rem))]`, `w-full sm:w-[…]` (or `fluid`), `md:w-[…]`. A fixed width is only fine on an element that cannot outgrow its parent (icon tile, avatar, skeleton).
- Do not hide information by ellipsis on phones without another way to read it: move it to a sub-line (`TruncatedText`, `hideBelow` + sub-line) or to the card view.
