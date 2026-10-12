# Spec — Assurance Voyage (EVO) au back-office

- **Status:** approved · **Created:** 2026-10-12
- **Brief:** [brief.md](brief.md) (scénarios S-1…S-5) · **Mission:** [mission.md](mission.md) · **Plan:** [build-plan.md](build-plan.md)
- **Contrat backend lu dans** `assurances-backend-v2` `develop` = `origin/main` (`cfe620a`), fichiers cités ci-dessous (L-002).

## Use cases

- **UC-1** Lecteur consulte un contrat (tous produits) sur `/contrats/{id}` — S-1.
- **UC-2** Lecteur actualise l'état EVO d'un contrat voyage et télécharge l'attestation — S-1.
- **UC-3** Lecteur parcourt la supervision voyage filtrée et paginée — S-2.
- **UC-4** ADMIN rattache / relance / refuse un contrat `TO_RECONCILE` — S-3.
- **UC-5** Destinataire d'une notification voyage ou remboursement ouvre la ressource — S-4.
- **UC-6** Gestionnaire saisit le numéro de remboursement — S-5.

## Contrat API (types écrits à la main)

```ts
type EvoIssuanceStatus = 'PENDING'|'SENDING'|'ISSUED'|'CERTIFICATE_READY'|'TO_RECONCILE'|'REJECTED'
type InsuranceType = 'IA'|'MRH'|'TRAVEL'          // productSnapshot.insuranceType ; productCode (nombre) varie selon l'environnement : ne jamais s'en servir
type TravelerRole = 'PRINCIPAL'|'SPOUSE'|'CHILD'|'ADULT'

// SubscriptionResponse.travel / SubscriptionDetailResponse.travel — clé absente sur IA/MRH (@JsonInclude NON_NULL)
interface TravelContractResponse {
  category: string|null; destinationArea: string|null      // "STANDARD", "AFRIQUE"
  startDate: string|null; endDate: string|null              // LocalDate
  composition: 'SINGLE'|'GROUP'|null
  formulaCode: string|null; formulaName: string|null
  evoIssuanceStatus: EvoIssuanceStatus|null                 // null tant que non payé
  policyNumber: string|null                                 // NSIACIVO…
  certificateDocumentId: number|null
  travelers: { role: TravelerRole; lastName: string; firstName: string; birthDate: string;
    gender: string|null; nationality: string|null; residenceCountry: string|null;
    passportNumber: string|null; email: string|null; phone: string|null;
    otherFields: Record<string,string>|null }[]
  evo?: { status: string /* 'active'|'disabled' */; policyNumber: string|null;
    startDate: string|null; endDate: string|null; cancelDate: string|null }   // seulement avec ?refresh=true et EVO joignable
}

// GET /subscriptions/travel (subscription:read-all) ; réponse des 3 actions (subscription:reconcile)
interface TravelSupervisionItemResponse {
  id: number; productCode: 'IA_STANDARD'|'IA_FOR_ALL'|'MRH_STANDARD'|'TRAVEL_STANDARD'
  clientId: number|null; status: SubscriptionStatus; evoIssuanceStatus: EvoIssuanceStatus|null
  evoIssuanceAttempts: number; evoPolicyId: string|null; policyNumber: string|null
  evoSentAt: string|null; evoLastError: string|null; reconcilableFrom: string|null   // LocalDateTime sans fuseau (Abidjan = UTC)
  coverageStart: string|null; coverageEnd: string|null; createdAt: string
}

// PUT /refunds/{id}/destination (withdrawal:write)
interface RefundResponse { id: number; reference: string /* RF-12 */; amount: number; currency: string;
  status: 'REQUESTED'|'AWAITING_DESTINATION'|'AWAITING_FUNDS'|'SENDING'|'SUBMITTED'|'PAID'|'FAILED';
  operator: 'ORANGE'|'MTN'|'MOOV'|'WAVE'|null; destination: string|null }
```

- `GET /subscriptions/{id}?refresh=true` : 200 toujours ; `travel.evo` absent si EVO en panne, en erreur, ou police inconnue. Cache serveur 1 min. Pas de nouvel appel EVO sans clic.
- `GET /subscriptions/{id}/policy-document` : PDF de l'attestation d'un voyage ; 404 « The policy document is not issued yet » tant que `certificateDocumentId` est nul ; 502 stockage.
- `POST …/reconciliation/attach` `{policyId}` (`@NotBlank @Size(max=100)`) · `…/retry` (sans corps) · `…/refuse` `{reason}` (`@NotBlank @Size(max=400)`).
- `evoLastError` : abandon = `Gave up after N attempts (max M): …` (préfixe `Gave up after `) ; relance = `Relaunched by …` ; refus = `Refusal recorded by …: <motif>`.
- Numéro de remboursement (`PhoneNumberNormalizer` + `WithdrawalRules`) : retirer `[\s.\-()]` ; `00…` → `+…` ; `225…` → `+225…` ; `0…` → `+225` + numéro ; doit valoir `+225` + 10 chiffres ; préfixe = 2 premiers chiffres nationaux : ORANGE `07`, MTN `05`, MOOV `01`, WAVE libre. `destination` `@Size(max=30)`.
- `GET /notifications` : seulement `unreadOnly` + page/size/sort. Pas de filtre.
- Droits (V50, V53) : `withdrawal:read`, `withdrawal:write`, `subscription:reconcile` accordés à ADMIN seul.
- `ErrorResponse { status, message, timestamp, errors? }`.

## Décisions

D-1…D-13 du [build-plan.md](build-plan.md#décisions) (approuvées le 2026-10-12).

## Critères d'acceptation

- **AC-1** `/contrats/{id}` montre pour tout contrat ce que montrait `ContractDrawer` (en-tête, signature et pièces, documents, quittances) ; un clic sur un contrat de la fiche client y mène ; `/clients/{id}?contract={c}` redirige vers `/contrats/{c}` ; id invalide → carte « Identifiant de contrat invalide » ; 404 → « Contrat introuvable » ; 403 → « Droit insuffisant ».
- **AC-2** Contrat voyage : section Voyage (catégorie, destination, dates, composition, formule `formulaName` ou `formulaCode`, prime `totalPremium` en FCFA), voyageurs (rôle, nom, naissance, passeport, nationalité), badge d'émission selon le tableau de la mission (`null` → « Non payé », neutre), n° de police EVO. Pas de section quittances de renouvellement.
- **AC-3** « Actualiser depuis EVO » appelle `?refresh=true` uniquement au clic ; avec `evo` → état EVO (Active / Désactivée, dates, annulation) ; sans `evo` → « EVO indisponible » et les données locales restent affichées. Bouton proposé seulement quand une police existe chez EVO (`ISSUED`, `CERTIFICATE_READY` ou n° de police connu) : le backend ne lit EVO qu'avec un `evoPolicyId`, sinon la réponse serait toujours sans `evo` ; à défaut « Pas encore de police chez EVO ». La réponse de `refresh` remplace aussi le contrat en cache (état local à jour).
- **AC-4** « Télécharger l'attestation » visible si `certificateDocumentId` ; sinon « Attestation pas encore disponible ». Erreur 404/502 sous la ligne. Aucune URL EVO.
- **AC-5** `/contrats/voyage` : filtre `TO_RECONCILE` par défaut, « Tous » + 6 états, page dans l'URL ; jamais de `sort` envoyé ; compteur = `totalElements` (L-006) ; colonnes : contrat (n° police ou `#id`), client (lien), état, tentatives, dernier envoi, couverture, dernière erreur (tronquée), « Décision possible à partir du … » ; clic → `/contrats/{id}?from=voyage` ; 404 → « L'offre voyage n'est pas active sur ce serveur. » ; 403 → « Droit insuffisant » ; vide → état vide.
- **AC-6** Encadré « Décision à prendre » seulement si l'état est `TO_RECONCILE` ; rappel Cover Edge ; aide « Vérifier la configuration EVO avant de relancer » si `evoLastError` commence par « Gave up after » ; boutons masqués si `subscription:reconcile` est connu et absent ; désactivés avant `reconcilableFrom` avec « Décision possible à partir du … » ; actifs ensuite. Si la ligne de supervision est introuvable, l'encadré le dit et ne propose aucun bouton.
- **AC-7** Rattacher : identifiant obligatoire (100 car.) ; 422 MISMATCH → `message` sous le champ ; NOT_CONFIRMED, ALREADY_ATTACHED, 400 → message sous le champ ; 502 → « EVO ne répond pas » ; succès → toast, état mis à jour.
- **AC-8** Relancer : confirmation ; 422 `TRAVEL_QUOTE_EXPIRED` → « Le devis EVO a expiré : refusez l'émission. » ; succès → état mis à jour (peut être `SENDING`).
- **AC-9** Refuser : motif obligatoire (400 car., compteur) puis confirmation explicite irréversible (remboursement, aucune commission) ; succès → `REJECTED` + `CANCELLED`.
- **AC-10** Erreurs communes : `TRAVEL_NOT_TO_RECONCILE` → message + données rechargées ; `TRAVEL_RECONCILIATION_TOO_EARLY` → « Décision pas encore possible » ; 404 ; 403 → « Droit insuffisant ».
- **AC-11** Notifications : `TRAVEL_ISSUANCE_TO_RECONCILE`, `TRAVEL_ISSUANCE_REJECTED`, `TRAVEL_CERTIFICATE_MISSING` (et toute ressource `SUBSCRIPTION`) → `/contrats/{id}` ; `REFUND_ATTENTION` → `/remboursements/{id}` ; `PAYOUT_FUNDS_INSUFFICIENT` → aucun lien ; existants (support, sinistre) inchangés.
- **AC-12** `/remboursements/{id}` : référence `RF-{id}`, texte de l'alerte la plus récente pour ce remboursement (ou « alerte introuvable »), aide-mémoire des causes ; formulaire opérateur + numéro (masqué si `withdrawal:write` connu et absent) ; validation client du format et du préfixe ; 422 `REFUND_INVALID_STATUS` → « Ce remboursement n'attend pas de numéro. » ; `WITHDRAWAL_OPERATOR_MISMATCH`, `INVALID_PHONE_NUMBER` → sous le champ ; 404, 403 ; succès → « Numéro enregistré, le versement repart » + statut renvoyé.
- **AC-13** Menu Contrats : « Modifications » (`amendment:read-all`) et « Supervision voyage » (`subscription:read-all`), chacune filtrée par son droit connu (L-005) ; groupe masqué sans entrée ; Ctrl+K trouve « Supervision voyage ».
- **AC-14** Dates au format `formatClaimDate` (heure d'Abidjan, sans conversion) ; montants `formatFcfa`.

## Hors périmètre

Voir [brief.md § Scope](brief.md#scope).

## Revisions

- 2026-10-12 — spec initiale (architect).
- 2026-10-12 — AC-3 précisé pendant le build (S4) : bouton d'actualisation seulement quand une police existe chez EVO.
