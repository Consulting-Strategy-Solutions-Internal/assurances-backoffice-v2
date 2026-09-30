# Fix — Recherche de /clients très lente, lettres perdues à la frappe

- **Status:** in-progress
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** —
- **Branch:** `fix/client-search-lag` · **Worktree:** `.claude/worktrees/fix-client-search-lag` · **Ports:** app 3002
- **Area:** routes protégées (`src/routes/_auth.tsx`), toutes les pages à filtres dans l'URL · **Lessons:** —

## Report

- **Symptom:** dans `/clients`, le champ « Rechercher un client » est « super lent » (utilisateur, 2026-09-30). Mesuré : 7 frappes (« kouassi », 40 ms d'écart) → 7 appels de server fn, et le champ finit sur « i » — 6 lettres perdues ; l'URL garde `q=i`.
- **Expected:** la saisie s'affiche immédiatement, sans lettre perdue ; aucun appel réseau par frappe (le filtrage est local).
- **Where:** back-office, `main` @ `6342806`, dev + proxy vers la démo, compte admin.
- **How to trigger:** ouvrir `/clients`, taper vite dans la recherche.
- **Since:** depuis que les filtres vivent dans l'URL (vague UX 2026-09-30) avec la garde `_auth` qui appelle `verifyAuth()` à chaque navigation.
