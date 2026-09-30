# Build plan — Cloisonnement des clients par partenaire (admin)

- **Status:** done
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** —
- **Branch:** `feat/client-isolation` · **Worktree:** `.claude/worktrees/client-isolation` · **Ports:** app 3005
- **Spec:** ci-dessous · **ADRs:** backend ADR-0024 · **Lessons applied:** L-002 (contrat lu dans `ClientController` de la branche backend `feat/client-isolation`, PR #121), L-003, L-005, L-006, L-012

## Spec

**Demande (utilisateur, 2026-09-30) :** intégrer le cloisonnement des clients (backend PR #121, en cours de déploiement — pas encore sur la démo).

**Contrat backend (lu dans `ClientController.java`, `origin/feat/client-isolation`) :**

- `GET /clients?partnerId=<id>|none` : filtre back-office (absent = tous ; autre valeur → 400 « Invalid partnerId »). `ClientResponse` ne porte pas le partenaire.
- `PUT /clients/{id}/owner-partner` corps `{ "partnerId": 7 | null }` (champ obligatoire, `{}` → 400 `errors.partnerId = REQUIRED`) ; 204 ; 404 client ou partenaire inconnu/supprimé ; 403 sans `backoffice:admin`. Journalisé côté serveur, pas de route de lecture du journal. Devis et contrats existants inchangés ; seuls la fiche et les prochains devis suivent.

**Décisions (défauts, sans question) :**

- D-1 Liste `/clients` : sélecteur « Partenaire » (`SearchableSelect` : « Tous les partenaires », « Sans partenaire », partenaires de `GET /partners`), `?partner=<id>|none` dans l'URL, envoyé en `partnerId` au serveur ; recherche, compteurs et KPI portent sur les clients du filtre.
- D-2 Le partenaire du filtre est affiché dans l'en-tête de la liste (compteur : « 12 clients · partenaire Sunu Distribution » / « · sans partenaire »).
- D-3 Fiche client : bouton « Changer de partenaire » (visible sauf si `backoffice:admin` est connu et absent — action que le serveur garde, L-005) → dialogue : sélecteur (partenaires ou « Aucun partenaire »), encadré qui explique (les vendeurs de l'ancien partenaire n'y auront plus accès ; devis et contrats déjà faits inchangés, prochains devis au nouveau partenaire), bouton « Confirmer ».
- D-4 Le partenaire actuel n'est pas connu (non exposé) : le dialogue le dit et ne présélectionne rien.
- D-5 Erreurs : 400 → « Choisissez un partenaire ou « Aucun partenaire ». » ; 404 → partenaire supprimé entre-temps (liste rechargée) ou client introuvable, selon le `message` ; 403 → « Seule l'administration NSIA peut changer le partenaire d'un client. » ; autre → message générique. Affichées dans le dialogue.
- D-6 204 → toast « Partenaire de <client> : <partenaire>. » (ou « <client> n'a plus de partenaire. »), nommé d'après le partenaire **envoyé** ; invalidation des listes `['clients', …]`. Sélecteur figé pendant l'envoi. _(revue R1)_
- D-8 Compteur : « sur N » seulement quand la recherche ou un filtre local retire des clients (pas de « 5 clients sur 5 »). _(revue R1)_
- D-7 Hors périmètre (critère « aucun changement pour les autres écrans admin ») : repérer dans la liste des vendeurs ceux sans partenaire ni agence — à proposer à part.

**Critères d'acceptation :**

- AC-1 Filtre `partnerId` : un id, `none`, ou rien (tous) ; l'URL le garde ; valeur invalide dans l'URL ignorée (jamais de 400).
- AC-2 En-tête de la liste : partenaire du filtre nommé.
- AC-3 Fiche client : rattacher (`{partnerId: 7}`) et détacher (`{partnerId: null}`) ; 204 → toast + listes rafraîchies.
- AC-4 400, 404 et 403 affichés en français dans le dialogue.

## Steps

- [x] **S1.** Services (`getClients`/`getAllClients` + `partnerId`, clés, `reassignClientPartner`) + logique pure `src/lib/client-partner.ts` (filtre, corps, erreurs) — verify: tests unitaires
- [x] **S2.** Liste `/clients` : sélecteur Partenaire, `?partner`, en-tête — AC-1, AC-2 — verify: test de route
- [x] **S3.** Fiche client : `ChangePartnerDialog` — AC-3, AC-4 — verify: tests composant

## Review findings

**Round 1** — 2026-09-30 · base `origin/main` · HEAD `0765d44` · verdict : prêt à commiter (0 🔴, 0 🟡, 3 ⚪)

- [x] **R1-1** ⚪ id démesuré dans `?partner` (`1e30`) → 400 serveur — `src/lib/client-partner.ts:13` → `Number.isSafeInteger`, cas ajoutés au test
- [x] **R1-2** ⚪ toast lu sur la sélection courante, pas celle envoyée — `src/components/clients/ChangePartnerDialog.tsx:46` → message depuis les `variables`, sélecteur désactivé pendant l'envoi, test R1-2
- [x] **R1-3** ⚪ sélecteur Partenaire de la liste non testé en interaction — `src/routes/_auth/clients.tsx:195` → test « le sélecteur Partenaire écrit ?partner »
- Plan gaps (compteur, texte du toast) : D-6 et D-8 mis à jour.
- Hors diff : « Retour aux clients » (`backSearch` figé) perd les filtres de la liste — préexistant, non traité.

**Round 2** — 2026-09-30 · re-review of `0d3c9a7` · R1-1…3 confirmés corrigés, aucun nouveau constat · verdict : prêt

## Acceptance run

**Run 1** — 2026-09-30 · HEAD après R1 · Playwright contre la démo via le proxy de dev (port 3005), compte admin. La démo n'a pas encore le backend #121 : `GET /clients?partnerId=` est intercepté (réponse réelle réduite à 2 clients) et `PUT /owner-partner` simulé (204, puis 404, puis 403). Aucune écriture réelle.

- AC-1 ✅ « Tous » → 15 clients (réel) ; partenaire DSIT → `?partner=402`, `partnerId=402` envoyé ; « Sans partenaire » → `?partner=none`, `partnerId=none` envoyé ; `?partner=1e30` ignoré (15 clients, pas de 400).
- AC-2 ✅ « 2 clients · partenaire DSIT », « 2 clients · sans partenaire ».
- AC-3 ✅ `{"partnerId":402}` → 204, dialogue fermé, toast « Partenaire de Yann Konaté : DSIT. » ; `{"partnerId":null}` envoyé pour « Aucun partenaire ».
- AC-4 ✅ 404 → « Ce partenaire n'existe plus… », 403 → « Seule l'administration NSIA… ».
- 390 px : pas de débordement ; libellé du bouton raccourci en « Confirmer » (coupé à 390 px), reconfirmé.
- Erreurs de page : aucune.
- À refaire après déploiement de #121 : une lecture réelle `GET /clients?partnerId=…` (sans écriture).
