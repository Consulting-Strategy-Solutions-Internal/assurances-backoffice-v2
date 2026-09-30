# Build plan — Documents des contrats dans la fiche client

- **Status:** shipped — fusionnée dans main (2026-09-30)
- **Created:** 2026-09-30 · **Updated:** 2026-09-30
- **PR:** https://github.com/Consulting-Strategy-Solutions-Internal/assurances-backoffice-v2/pull/12
- **Branch:** `feat/client-documents` · **Worktree:** `.claude/worktrees/client-documents` · **Ports:** app 3003
- **Spec:** ci-dessous · **ADRs:** — · **Lessons applied:** L-002 (types lus dans les DTO backend), L-003 (tri pour `fetchAllPages`), L-005/L-009, L-006, L-010, L-012

## Spec

**Demande (utilisateur, 2026-09-30) :** « dans les détails d'un client on ne peut pas voir ses contrats et signatures et autres documents dans le back-office ». Choix de l'utilisateur : **front d'abord** — livrer ce que l'API permet, lister ce qui manque côté backend.

**Ce que l'API permet à l'admin (`subscription:read-all`, `amendment:read-all`) — backend `origin/main` :**

- `GET /subscriptions/{id}` : `signed` (booléen), `identityDocuments[{type, front, back}]`, `policyNumber`, `amendmentNumber` (0 = police, +1 par avenant), `policyDocumentId`.
- `GET /subscriptions/{id}/policy-document?amendment=n` : PDF de la police (n = 0, avec la signature imprimée) ou de l'avenant n.
- `GET /subscriptions/{id}/receipts/{receiptNumber}/document` : PDF d'une quittance ; numéros trouvés via `GET /subscription-amendments?status=APPLIED` (pas de filtre par contrat → filtrage local) et `GET /subscriptions/{id}/renewal` (`receipt`, 404 s'il n'y a pas de renouvellement).

**Refusé par le backend (hors périmètre, demandes backend) :** image de la signature et photos des pièces d'identité (`subscription:read` + principal client/vendeur, décisions D25/D37 de `quote-to-policy`) ; espace documents du client (`/clients/me/documents`, `client:self`, ADR `client-documents` §5) ; liste des quittances d'un contrat ; filtre `clientId` sur `GET /subscriptions` ; PDF de l'avis de renouvellement.

**Décisions (défauts, sans question) :**

- D-1 Un clic sur une ligne du tableau « Contrats » de la fiche client ouvre un panneau latéral (`Sheet`) ; `?contract=<id>` dans l'URL.
- D-2 Panneau : en-tête (police, produit, statut) ; « Signature et pièces d'identité » (Signé / Non signé, pièces fournies par type et faces, note : images réservées au client et à son vendeur, signature imprimée sur le PDF de la police) ; « Documents du contrat » (Police = avenant 0, puis Avenant 1…n) — absents tant que `policyNumber` est nul (« émis après le paiement et la signature ») ; « Quittances » (modifications appliquées de ce contrat dont le PDF existe — `isReceiptDownloadable` — et quittance de renouvellement payée).
- D-4 Rôle sans `amendment:read-all` : la liste des modifications répond 403 ; on garde la quittance de renouvellement et on affiche une note (« demandent le droit de consulter les modifications de contrat »), pas une erreur. _(revue R1)_
- D-3 Erreurs de PDF : `mapPolicyDocumentError` / `mapReceiptDocumentError` existants, affichées sous le document concerné.

**Critères d'acceptation :**

- AC-1 Cliquer un contrat de la fiche client ouvre son panneau ; fermer le panneau retire `?contract`.
- AC-2 Le panneau montre « Signé » / « Non signé » et les pièces fournies (« Carte nationale d'identité — recto et verso »…), ou « Aucune pièce fournie ».
- AC-3 Téléchargement de la police et de chaque avenant (`amendment = 0…amendmentNumber`), nommés « Police <n°>.pdf » / « Avenant <k> — <n°>.pdf » ; erreur lisible sous la ligne.
- AC-4 Quittances téléchargeables des modifications appliquées du contrat et du renouvellement ; « Aucune quittance disponible » sinon.
- AC-5 Aucun appel aux routes refusées (`/signature`, `/identity-document`).

## Steps

- [x] **S1.** Types (`SubscriptionDetailResponse` complété, renouvellement) + services + logique pure (`src/lib/contract-documents.ts`) — verify: tests unitaires
- [x] **S2.** Panneau `src/components/clients/ContractDrawer.tsx` — AC-2…AC-5 — verify: tests composant
- [x] **S3.** Fiche client : lignes cliquables, `?contract` — AC-1 — verify: test de route
- [x] **S4.** Contrôles + recette sur la démo

## Review findings

> Last review: round 1 · 2026-09-30 · base `d9a583b` · HEAD `5639a39` · verdict : prêt après le 🟡 — correctifs dans `4e14c32`, revérifiés sur la démo (même recette, 0 régression)

- [~] **R1-1** 🟡 Modifications refusées (403) → la quittance de renouvellement disparaissait derrière « Impossible de retrouver les quittances » — `src/components/clients/ContractDrawer.tsx:167` (fix: 4e14c32)
- [~] **R1-2** ⚪ Test AC-5 sans valeur (services mockés, `api.get` jamais appelé) — remplacé par `ContractDrawer.api.test.tsx` avec les vrais services (fix: 4e14c32)
- [~] **R1-3** ⚪ Fermeture du panneau (moitié d'AC-1) non testée ; ligne sans `RowChevron` (ui-registry) — `src/routes/_auth/clients_.$clientId.tsx` (fix: 4e14c32)
- [~] **R1-4** ⚪ Teintes de statut recopiées → `SUBSCRIPTION_TONES` partagé ; clé de cache écrite à la main → `amendmentsKeys.allApplied` ; `saveBlob` recopié → `src/lib/download.ts` (fix: 4e14c32)
- [~] **R1-5** ⚪ Troncature à 2 000 modifications non signalée (fix: 4e14c32)

## Acceptance run

> Run: run 1 · 2026-09-30 · HEAD `30f993b` · 5 pass · 0 fail — dev (port 3003) + proxy vers la démo, compte admin, Playwright, lecture seule

- AC-1 — pass — fiche du client 52, clic sur IA-2026-000002 → panneau, URL `?contract=402` ; « Fermer » → URL sans `contract`, panneau fermé.
- AC-2 — pass — « Signé », « Carte nationale d’identité — recto et verso », note sur les images réservées.
- AC-3 — pass — vrais téléchargements : « Police IA-2026-000002.pdf » (43 Ko) et « Avenant 1 — IA-2026-000002.pdf » (49 Ko), en-tête `%PDF-`.
- AC-4 — pass — « Aucune quittance disponible. » (aucune quittance téléchargeable sur la démo pour ce contrat).
- AC-5 — pass — 0 requête vers `/signature` ou `/identity-document`.
- Responsive — 0 px de débordement à 1280 et 390 px ; aucune erreur de page.
