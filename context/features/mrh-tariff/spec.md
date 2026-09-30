# Tarif MRH NSIA — spec

**Source :** brief collé par l'utilisateur (2026-09-30) + code du backend `origin/main` (PR #110, ADR-0021 backend : grille MRH figée). Contrats lus dans les contrôleurs/DTO : `LegalQualityController`, `BaseRateController`, `WarrantyController`, `LegalQualityWarrantyController`, `AccessoryController`, `ProductSnapshot`.

## Périmètre

- Grille MRH (4 situations, 11 garanties, 39 lignes) : **consulter + modifier**. Aucun `POST`/`DELETE` (405 côté API). Le back-office n'avait encore aucun écran de grille : il n'y avait rien à retirer, sauf `createMrhQuotation` (inutilisé, portait `rentalValue`).
- Accessoires `MRH_STANDARD` et `IA_STANDARD` : CRUD, déplacement de produit, import CSV.
- Tiroir des cotations : snapshot MRH à jour.
- Hors périmètre : `IA_FOR_ALL` (accessoires compris dans le forfait) ; création de devis MRH (action vendeur).

## Cas d'usage

- **UC-1** Modifier le nom / la description d'une situation (`legalquality:write`).
- **UC-2** Modifier les taux de base d'une situation (`baserate:write`).
- **UC-3** Modifier le libellé et le taux de taxe d'une garantie (`warranty:write`).
- **UC-4** Modifier une ligne garantie × situation (valeurs du mode + obligatoire) (`legalquality:write`).
- **UC-5** Gérer les tranches d'accessoires d'un produit (`accessory:write`).
- **UC-6** Consulter un devis MRH dans le tiroir des cotations.

## Décisions

- **D-1** Navigation : Produits › Multirisque Habitation › MRH Standard, route `/produits-mrh/mrh-standard/{situations,garanties,tarifs,accessoires}`, même gabarit à onglets qu'IA Standard. _(décidé)_
- **D-2** Accessoires : un écran partagé paramétré par produit, dans IA Standard › Accessoires et MRH Standard › Accessoires ; le formulaire propose le produit (IA*STANDARD / MRH_STANDARD, pré-rempli sur celui de l'écran). *(décidé)\_
- **D-3** Modification par fenêtre (`FormDialog`) par ligne ; codes affichés comme repères, jamais modifiables. _(décidé)_
- **D-4** Après chaque `PUT` : `GET /{id}`, la valeur relue est écrite dans le cache (`setQueryData`) puis la liste invalidée ; l'écran affiche la valeur renvoyée par l'API (L-004). _(décidé)_
- **D-5** Corps envoyés — le backend l'emporte sur le brief quand ils divergent _(décidé)_ :
  - Situation : `{ name, description }` toujours tous les deux (le backend remet `description` à `null` s'il est absent).
  - Taux de base : seulement les champs modifiés (fusion côté backend : absent/null = inchangé).
  - Garantie : `{ name, taxRate }`, obligatoires.
  - Ligne garantie × situation : **tous** les champs du mode (POURCENTAGE → `rate` ; FORFAIT → `flatAmount` ; CAPITAL → `rate` + `capitalShare`), les autres absents ; `mandatory` seulement s'il change (le backend exige les champs du mode à chaque PUT).
- **D-6** Erreurs 400 : `errors.<champ>` → message FR sous le champ (`NOT_ALLOWED_FOR_LEGAL_QUALITY`, `REQUIRED_FOR_LEGAL_QUALITY`, `REQUIRED_FOR_PREMIUM_TYPE`, `NOT_ALLOWED_FOR_PREMIUM_TYPE`, messages Jakarta) ; clé hors formulaire → bandeau.
- **D-7** Taux de base : on affiche les champs non nuls de la situation, plus ceux que sa base de calcul exige même vides en base (LOCATIVE : locatif + multiplicateur ; sinon : bâtiment) — NON_OCCUPANT_OWNER : bâtiment seul ; TENANT : locatif + multiplicateur + contenu ; autres : bâtiment + contenu. Un refus sur un champ non affiché part en bandeau avec son libellé.
- **D-8** `minimumContentsValue` (« Valeur minimale du contenu (FCFA) ») : affiché et modifiable seulement s'il est non nul, facultatif, avec la mention « sans effet sur la prime ». _(défaut, revue R1)_
- **D-9** Textes (nom, description, libellé) limités à 255 caractères côté écran (colonnes `varchar(255)`, sans `@Size` côté API). Si la relecture échoue après un `PUT` réussi, on affiche la réponse du `PUT` avec un avertissement. _(revue R1)_

## Critères d'acceptation

- **AC-1** Aucun appel `POST`/`DELETE` sur `/mrh-standard/legal-qualities`, `/base-rates`, `/warranties`, `/legal-quality-warranties`, ni bouton qui y mène.
- **AC-2** UC-1…UC-4 : modifier → relire → la nouvelle valeur (celle de l'API) s'affiche ; une 400 `errors.<champ>` s'affiche sous le bon champ.
- **AC-3** Taux de base : libellés « Taux bâtiment (‰) », « Taux contenu (‰) », « Taux risques locatifs (‰) », « Multiplicateur du loyer ».
- **AC-4** Ligne garantie : seuls les champs du mode de la ligne ; case « Garantie obligatoire ».
- **AC-5** Accessoires : création, modification, suppression, import CSV (y compris 422 `ImportResult` listé ligne par ligne), 422 `LAST_ACCESSORY_HAS_ACTIVE_CONTRACT` → « Impossible : c'est la dernière tranche du produit et des contrats sont en cours. », bandeau « Aucun accessoire saisi : les devis de ce produit sont refusés. » quand la liste est vide.
- **AC-6** Aucune référence à `rentalValue` côté devis ; le tiroir montre `rentalRisks`, loyer mensuel × multiplicateur, occupation, et le mode CAPITAL.
- **AC-7** Libellés en français, noms de champs API inchangés.

## Revisions

- 2026-09-30 — revue R1 : D-7 révisée (taux exigés affichés même vides), D-8 et D-9 ajoutées.
