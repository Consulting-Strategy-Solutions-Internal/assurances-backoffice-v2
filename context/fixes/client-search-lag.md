# Fix — Recherche de /clients très lente, lettres perdues à la frappe

- **Status:** shipped — fusionné dans main via la PR #10 (2026-09-30), à la demande de l’utilisateur avant la fin de la revue
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/10
- **Branch:** `fix/client-search-lag` · **Worktree:** `.claude/worktrees/fix-client-search-lag` · **Ports:** app 3002
- **Area:** routes protégées (`src/routes/_auth.tsx`), toutes les pages à filtres dans l'URL · **Lessons:** L-012

## Report

- **Symptom:** dans `/clients`, le champ « Rechercher un client » est « super lent » (utilisateur, 2026-09-30). Mesuré : 7 frappes (« kouassi », 40 ms d'écart) → 7 appels de server fn, et le champ finit sur « i » — 6 lettres perdues ; l'URL garde `q=i`.
- **Expected:** la saisie s'affiche immédiatement, sans lettre perdue ; aucun appel réseau par frappe (le filtrage est local).
- **Where:** back-office, `main` @ `6342806`, dev + proxy vers la démo, compte admin.
- **How to trigger:** ouvrir `/clients`, taper vite dans la recherche.
- **Since:** depuis que les filtres vivent dans l'URL (vague UX 2026-09-30) avec la garde `_auth` qui appelle `verifyAuth()` à chaque navigation.

## Cause

Deux mécanismes qui s'additionnent. (1) Chaque frappe dans un filtre lié à l'URL est une navigation TanStack Router ; le `beforeLoad` de `/_auth` appelait `verifyAuth()` — une server fn qui rappelle `/auth/me` — à **chaque** navigation, même quand seuls les paramètres de recherche changent : la frappe attendait un double aller-retour (navigateur → serveur Nitro → API). (2) `ToolbarSearch` affichait directement la valeur de l'URL : tant que la navigation n'était pas terminée, React remettait l'ancienne valeur dans le champ et la lettre suivante repartait d'elle — d'où les lettres perdues, même sans réseau. Présent depuis que les filtres vivent dans l'URL (vague UX du 2026-09-30).

## Fix

- **Change:** `src/routes/_auth.tsx:9` — dans le navigateur, pas de nouvel appel quand `cause === 'stay'` et que le chemin n'a pas changé ; la page rendue par le serveur compte comme vérifiée ; rien n'est mémorisé côté serveur ; un refus remet la mémoire à zéro. Une session expirée reste interceptée par les 401 de l'API (`src/lib/api.ts`).
- **Change:** `src/components/layout/Toolbar.tsx:54` — `ToolbarSearch` garde son brouillon pendant la saisie et ne suit la valeur du parent qu'hors édition (remise à zéro par « Réinitialiser »).
- **Regression test:** `src/routes/-auth-guard.test.ts` (7 frappes = 0 ou 1 appel, changement de page = nouvel appel, refus → /login puis revérification, rien de mémorisé côté serveur) ; `src/components/layout/ToolbarSearch.test.tsx` (parent en retard : « kouassi » intact ; remise à zéro suivie).
- **Mesure réelle** (dev + proxy vers la démo, Playwright, 7 frappes à 40 ms) : avant 7 appels server fn, champ final « i » ; après 0 appel, champ « kouassi », URL `q=kouassi`.
- **Other occurrences:** les 10 listes qui utilisent `ToolbarSearch` (clients, cotations, partenaires, sinistres, support…) sont corrigées par le même changement ; les autres champs de recherche (métiers, matrice des permissions, `SearchableSelect`) ont un état local et n'étaient pas touchés.
- **Commit:** `d027638`
