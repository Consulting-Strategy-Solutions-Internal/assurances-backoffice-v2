# Mission (texte fourni par l'utilisateur, 2026-10-12)

> Copie de référence de la demande. Certaines phrases étaient tronquées à la réception ; le Swagger et le code backend (`assurances-backend-v2`, `context/features/travel-evo/`) font foi. Les décisions prises depuis sont dans [brief.md](brief.md).

## Contexte
- Produit `TRAVEL_STANDARD`, type `TRAVEL` ; police émise chez EVO (Cover Edge) ; le backend fait tous les échanges avec EVO, le back-office ne parle qu'à notre API.
- Trois besoins : consulter les contrats voyage ; superviser leur émission chez EVO et trancher les cas incertains ; traiter les remboursements qui demandent une action humaine.

## Sources de vérité
- Swagger, groupe `back-office` : `https://nsia.c2s-demo.cloud/api/swagger-ui/index.html`.
- Postman : collection « NSIA Connect » (workspace XGS), groupe « Voyage — Assurance Voyage », dossiers « Supervision voyage » et « Remboursements ».
- Écart prompt / Swagger → le Swagger fait foi.

## Activation et droits
- Interrupteur backend `app.travel.enabled` (coupé en prod pour l'instant) : coupé, l'offre disparaît des catalogues et `/quotations/travel/**` répond 404 ; les écrans de supervision répondent une liste vide ou un 404.
- Chaque action selon le droit de l'utilisateur ; 403 → « droit insuffisant ».

| Droit | Qui | Ce qu'il ouvre |
|---|---|---|
| `subscription:read-all` | lecture | liste de supervision voyage, détail des contrats |
| `subscription:reconcile` | ADMIN seul (MANAGER ne l'a pas) | trancher une émission |
| `withdrawal:read` | lecture | reçoit les alertes `REFUND_ATTENTION` |
| `withdrawal:write` | gestionnaire | saisir le numéro de remboursement d'un client |

## 1. Contrats voyage dans les écrans existants
- `GET /subscriptions/{id}` et la liste portent un bloc `travel` (`TravelContractResponse`) : voyage (catégorie, destination, dates), formule (`formulaCode`, `formulaName`), voyageurs, `evoIssuanceStatus`, `policyNumber` (EVO `NSIACIVO…`), `certificateDocumentId`.
- Affichage dans le détail, avec un badge d'état d'émission.
- Montants : prime = `totalPremium`. Pour un devis voyage, montants à 0 ; la prime se lit par formule dans `travel.formulas[]` (`productCode`, `name`, `premium` XOF, `expiresAt`).
- `GET /subscriptions/{id}?refresh=true` ajoute `travel.evo` (état de la police lu chez EVO), seulement sur un bouton « Actualiser depuis EVO ». EVO en panne → 200 sans `evo` : afficher « EVO indisponible » et les données locales.
- Attestation : `GET /subscriptions/{id}/policy-document` (PDF ; `?amendment=` autre que 0 → 404). Jamais d'URL EVO.
- Actions à masquer pour un voyage : résiliation (422 `TRAVEL_NOT_TERMINABLE`), renouvellement, sinistre, avenant. Le contrat passe `EXPIRED` le lendemain de la fin du séjour.

| `evoIssuanceStatus` | Sens | Badge |
|---|---|---|
| `PENDING` | en attente d'envoi à EVO | neutre |
| `SENDING` | envoi en cours | neutre |
| `ISSUED` | police créée, attestation pas encore reçue | info |
| `CERTIFICATE_READY` | police et attestation OK | succès |
| `TO_RECONCILE` | issue incertaine, décision humaine requise | alerte |
| `REJECTED` | refusée, contrat annulé et remboursement demandé | (danger) |

## 2. Écran « Supervision voyage »
- `GET /subscriptions/travel?evoIssuanceStatus=…&page=0&size=20`, droit `subscription:read-all`, `PageResponse<TravelSupervisionItemResponse>`, plus récente d'abord. Aucun tri (`sort` → 400).
- Filtre `evoIssuanceStatus` (une des six valeurs ou aucune), conseillé : `TO_RECONCILE`.
- Champs : `id`, `productCode`, `clientId`, `status`, `evoIssuanceStatus`, `evoIssuanceAttempts`, `evoPolicyId`, `policyNumber`, `evoSentAt`, `evoLastError`, `reconcilableFrom`, `coverageStart`, `coverageEnd`, `createdAt`.
- `reconcilableFrom` : seulement pour `TO_RECONCILE` ; avant (envoi + 24 h), les trois actions sont refusées → « Décision possible à partir du … », boutons désactivés.
- Chaque ligne mène au détail du contrat.

### Trancher un contrat `TO_RECONCILE`
- Droit `subscription:reconcile` ; boutons visibles seulement si `TO_RECONCILE`, actifs à partir de `reconcilableFrom`. Les trois actions renvoient le `TravelSupervisionItemResponse` à jour.
- Rappel à afficher : demander à Cover Edge si une police existe pour ce client (nom, passeport, dates, prime).

1. Police trouvée : `POST /subscriptions/travel/{id}/reconciliation/attach` `{"policyId": "<identifiant EVO>"}`. Rattachée seulement si active, même produit, même prime, mêmes dates, mêmes voyageurs, portée par aucun autre contrat → `ISSUED` ; attestation et commission suivent automatiquement. Erreurs : 400 `errors.policyId` ; 422 `errors.policyId` = `TRAVEL_POLICY_NOT_CONFIRMED` (vérifier l'identifiant), `TRAVEL_POLICY_MISMATCH` (afficher le `message`, il nomme l'écart), `TRAVEL_POLICY_ALREADY_ATTACHED` ; 502 EVO ne répond pas.
2. Aucune police, devis valable : `POST /subscriptions/travel/{id}/reconciliation/retry` sans corps ; un seul nouvel envoi, l'état peut être `SENDING` juste après. 422 `errors.subscriptionId = TRAVEL_QUOTE_EXPIRED` → refuser à la place.
3. Aucune police, devis expiré ou décision de ne pas émettre : `POST /subscriptions/travel/{id}/reconciliation/refuse` `{"reason": "…"}` (obligatoire, 400 sinon) → `REJECTED` + `CANCELLED`, remboursement demandé, aucune commission. Confirmation explicite (irréversible).

Erreurs communes : 422 `errors.subscriptionId` = `TRAVEL_NOT_TO_RECONCILE` (recharger), `TRAVEL_RECONCILIATION_TOO_EARLY` ; 404 ; 403.

Plafond de renvois : `evoLastError` contient « Gave up after N attempts » → EVO n'a rien créé, passé `TO_RECONCILE` après 5 tentatives, souvent mauvaise configuration EVO : afficher une aide « vérifier la configuration EVO avant de relancer ».

## 3. Notifications

| `type` | Droit | Ressource | Action |
|---|---|---|---|
| `TRAVEL_ISSUANCE_TO_RECONCILE` | `subscription:reconcile` | `SUBSCRIPTION` | ouvrir le contrat, trancher à partir de `reconcilableFrom` |
| `TRAVEL_ISSUANCE_REJECTED` | `subscription:reconcile` | `SUBSCRIPTION` | information : contrat annulé, suivre le remboursement |
| `TRAVEL_CERTIFICATE_MISSING` | `subscription:reconcile` | `SUBSCRIPTION` | police créée, attestation absente depuis > 1 h ; reprise auto toutes les 10 min |
| `REFUND_ATTENTION` | `withdrawal:read` | `REFUND_REQUEST` | remboursement à traiter ; cause dans le texte |
| `PAYOUT_FUNDS_INSUFFICIENT` | (existant) | — | compte FineoPay à alimenter |

`TRAVEL_CONTRACT_CANCELLED`, `REFUND_PAID`, `REFUND_DESTINATION_REQUIRED` : destinés au client, rien à faire au back-office.

## 4. Remboursements à traiter
Pas de route de lecture ni de liste : l'écran part de `REFUND_ATTENTION` (`resourceId` = id du remboursement).

| Cause | Ce que le back-office propose |
|---|---|
| numéro payeur illisible (`AWAITING_DESTINATION`) | formulaire de saisie ; le client peut aussi le saisir depuis l'app |
| versement refusé, échoué ou introuvable chez FineoPay (`FAILED`) | vérifier chez FineoPay qu'aucun versement n'est parti, puis rembourser à la main ; jamais renvoyé automatiquement |
| versement en attente chez FineoPay > 24 h | vérifier chez FineoPay (alerte au plus une fois par jour) |
| montant > plafond FineoPay (1 000 000 F par transaction, `FAILED`) | remboursement manuel par virement |
| aucun fournisseur de versement réel activé (`REQUESTED`) | information : repartiront seuls à l'activation |

`PUT /refunds/{id}/destination` (droit `withdrawal:write`) `{"operator": "ORANGE"|"MTN"|"MOOV"|"WAVE", "destination": "05 44 00 11 22"}` — numéro ivoirien, avec ou sans +225, espaces ou tirets ; préfixe : Orange 07, MTN 05, Moov 01, Wave tout préfixe. Réponse `RefundResponse` (`status` → `REQUESTED`). Erreurs : 422 `errors.status = REFUND_INVALID_STATUS` ; 422 `errors.destination = WITHDRAWAL_OPERATOR_MISMATCH` ; 400 `errors.destination = INVALID_PHONE_NUMBER` ; 400 `errors.operator` ; 404.

## 5. Schéma OpenAPI
`TravelSupervisionItemResponse` : élément de la liste et réponse des trois actions (aucun champ JSON changé). `TravelContractResponse` : bloc `travel`.

## Règles générales
- Erreurs par `status` et `errors.*`, pas par `message` (sauf `TRAVEL_POLICY_MISMATCH`).
- Dates heure d'Abidjan (UTC+0), format habituel. Montants XOF sans décimales.

## Livrable attendu
1. Bloc voyage dans le détail, badge, actualisation EVO, attestation ; résiliation/renouvellement/sinistre/avenant masqués.
2. Supervision voyage : liste filtrable et paginée, 3 actions avec garde des droits, garde de `reconcilableFrom`, confirmation du refus, erreurs.
3. Les cinq notifications branchées, avec leurs liens.
4. Formulaire de saisie du numéro, ouvert depuis `REFUND_ATTENTION`.
5. Robustesse : offre coupée, EVO en panne (502, `refresh` sans `evo`), 403.
6. Tests : activation des boutons (`evoIssuanceStatus`, `reconcilableFrom`, droit) ; mapping des 422 ; validation opérateur/préfixe.
7. Résumé des écrans ajoutés et des questions restées ouvertes.

## Notes de l'utilisateur
- Pas d'écran de liste des remboursements : aucune route backend ; il faudrait d'abord les ajouter au backend.
- Rattachement impossible à tester en dev avec le faux EVO (toujours 422 `TRAVEL_POLICY_NOT_CONFIRMED`) ; seulement avec le vrai EVO UAT. Relance et refus fonctionnent avec le faux EVO.
- (2026-10-12) Préprod : offre active sur EVO UAT, paiements réels non remboursés, payout « logging », `TO_RECONCILE` / `AWAITING_DESTINATION` / `FAILED` à simuler — voir brief § Constraints.
