# Brief — Assurance Voyage (EVO) au back-office

- **Status:** final
- **Created:** 2026-10-12 · **Updated:** 2026-10-12
- Written by `scope` · Next: `architect` builds use cases, spec and plan from this brief.
- **Référence détaillée :** la mission de l'utilisateur (2026-10-12), recopiée dans [mission.md](mission.md) — endpoints, champs, codes d'erreur, droits, badges. Le Swagger (groupe `back-office`) et le code backend (`assurances-backend-v2`, feature `travel-evo` : `context/features/travel-evo/front-announcements.md`, `operations.md`) font foi en cas d'écart. Ce brief consigne ce qui précise ou tranche la mission.

## Problem

Le backend vend désormais l'assurance Voyage `TRAVEL_STANDARD`, émise chez l'assureur partenaire EVO (Cover Edge). Le back-office n'en montre rien : on ne voit pas les contrats voyage, personne ne peut trancher une émission incertaine (`TO_RECONCILE`), et les remboursements bloqués (numéro payeur illisible, versement échoué…) n'ont pas d'écran de traitement. L'offre est active sur la préprod depuis le 2026-10-12 (coupée en prod).

## Users

| Who | What they need from this |
|---|---|
| Lecteur (`subscription:read-all`) | consulter les contrats voyage et la liste de supervision |
| ADMIN (`subscription:reconcile`, MANAGER ne l'a pas) | trancher un contrat `TO_RECONCILE` : rattacher, relancer, refuser ; recevoir les alertes voyage |
| Gestionnaire remboursements (`withdrawal:read` / `withdrawal:write`) | recevoir `REFUND_ATTENTION`, saisir le numéro de remboursement d'un client |

## Success

- Un ADMIN alerté par `TRAVEL_ISSUANCE_TO_RECONCILE` ouvre le contrat depuis la notification, voit quand il pourra décider, et tranche sans quitter le back-office.
- Un gestionnaire alerté par `REFUND_ATTENTION` ouvre le remboursement et saisit un numéro valide ; le versement repart (`REQUESTED`).
- Aucun écran ne casse quand l'offre est coupée (liste vide / 404), quand EVO est en panne (502, `refresh` sans `evo`) ou sur un 403 (« Droit insuffisant »).

## Scenarios

### S-1: Consulter un contrat voyage
- **Who:** lecteur.
- **Walkthrough:** depuis la fiche client, la supervision ou une notification → `/contrats/{id}`. La page montre le contrat (ce que montrait le tiroir de la fiche client) et, pour un voyage, le bloc voyage : catégorie, destination, dates, formule, voyageurs, badge `evoIssuanceStatus`, n° de police EVO, attestation à télécharger, bouton « Actualiser depuis EVO ».
- **Example:** contrat #812, Afrique, 12/10 → 22/10, 2 voyageurs, `CERTIFICATE_READY` (badge succès), police `NSIACIVO00000056`, « Télécharger l'attestation ». « Actualiser » avec EVO en panne → « EVO indisponible » + données locales.

### S-2: Superviser les émissions
- **Who:** lecteur.
- **Walkthrough:** Contrats › Supervision voyage (`/contrats/voyage`), filtré sur `TO_RECONCILE` par défaut ; filtre parmi les 6 états ou « Tous », pagination serveur, aucun tri. Chaque ligne : contrat, client, état d'émission, tentatives, dernier envoi, dernière erreur, couverture, « Décision possible à partir du … ». Clic → `/contrats/{id}`.
- **Example:** 3 contrats `TO_RECONCILE`, l'un avec « Gave up after 5 attempts ».

### S-3: Trancher un contrat `TO_RECONCILE`
- **Who:** ADMIN.
- **Walkthrough:** sur `/contrats/{id}`, encadré « Décision à prendre » (visible seulement si `TO_RECONCILE`) : rappel « vérifier chez Cover Edge (nom, passeport, dates, prime) », alerte spécifique si `evoLastError` contient « Gave up after N attempts », puis Rattacher (saisie de l'identifiant EVO) / Relancer / Refuser (motif obligatoire + confirmation explicite, irréversible). Boutons désactivés avant `reconcilableFrom` avec « Décision possible à partir du … » ; masqués sans `subscription:reconcile`. Après succès, la page reflète la réponse. Erreurs mappées par code (`TRAVEL_POLICY_MISMATCH` : afficher le `message`).
- **Example:** l'ADMIN saisit un identifiant de police qui n'est pas celle du contrat → 422 `TRAVEL_POLICY_MISMATCH` « les dates de couverture diffèrent… » affiché sous le champ.

### S-4: Notifications
- **Who:** porteurs du droit de chaque type.
- **Walkthrough:** `TRAVEL_ISSUANCE_TO_RECONCILE`, `TRAVEL_ISSUANCE_REJECTED`, `TRAVEL_CERTIFICATE_MISSING` → `/contrats/{id}` ; `REFUND_ATTENTION` → `/remboursements/{id}` ; `PAYOUT_FUNDS_INSUFFICIENT` → information, sans lien.

### S-5: Traiter un remboursement
- **Who:** gestionnaire.
- **Walkthrough:** depuis `REFUND_ATTENTION` → `/remboursements/{id}` : texte de l'alerte tel quel, aide-mémoire des causes possibles et de quoi faire pour chacune, formulaire opérateur + numéro toujours proposé (droit `withdrawal:write`), validation préfixe/opérateur côté client (Orange 07, MTN 05, Moov 01, Wave tout préfixe ; +225, espaces, tirets admis). 422 `REFUND_INVALID_STATUS` → « Ce remboursement n'attend pas de numéro ».
- **Example:** MTN + « 07 12 34 56 78 » → refusé avant envoi (préfixe Orange). Alerte « est retenu : aucun fournisseur de versement réel n'est activé » → information, le formulaire n'est pas utile (le serveur répondrait 422).

## Scope

- **In:** page `/contrats/{id}` (tous produits) qui remplace `ContractDrawer` ; bloc voyage ; actualisation EVO ; attestation ; `/contrats/voyage` ; les 3 décisions sur la page contrat ; branchement des 5 notifications ; `/remboursements/{id}` ; robustesse (offre coupée, EVO en panne, 403) ; tests.
- **Out:** liste des remboursements (pas de route backend) ; création de devis ou de souscription voyage (pas d'écran de souscription au back-office, donc pas d'affichage des 422 `errors.travelFormulaCode`) ; types `TRAVEL_CONTRACT_CANCELLED`, `REFUND_PAID`, `REFUND_DESTINATION_REQUIRED` (destinés au client) ; résiliation/renouvellement/sinistre/avenant voyage (aucune de ces actions n'existe sur un contrat au back-office).
- **Smallest useful version:** supervision + page contrat avec bloc voyage et décisions + notification `TRAVEL_ISSUANCE_TO_RECONCILE`.

## Constraints

- Préprod `nsia.c2s-demo.cloud` : offre voyage active, branchée sur **EVO UAT** ; compte de test fourni à part par l'utilisateur.
- **Paiements réels (FineoPay) non remboursés sur la préprod** : ne créer aucun contrat de test payé ; la recette y est en **lecture**. Le rattachement y appelle le vrai EVO UAT : ne l'exécuter qu'avec l'accord explicite de l'utilisateur.
- Payout en mode « logging » sur la préprod : les remboursements restent `REQUESTED`, une alerte `REFUND_ATTENTION` « aucun fournisseur de versement réel » par demande et par jour (information). `AWAITING_DESTINATION` et `FAILED` n'y apparaissent pas → **mocks**.
- Un `TO_RECONCILE` ne s'obtient pas à la demande (fenêtre de 24 h) → l'UI des décisions et des 422 se teste sur **mocks**.
- Pas de client typé généré : types écrits à la main d'après l'OpenAPI / le code backend (L-002).
- Erreurs lues par `status` + `errors.*`, jamais par `message` (sauf `TRAVEL_POLICY_MISMATCH`). Dates heure d'Abidjan (UTC+0) au format habituel ; XOF sans décimales.
- UI selon `context/project/ui-registry.md` ; ESLint strict ; lessons L-001…L-012.

## Assumptions

| Assumption | Source | Status | How to verify |
|---|---|---|---|
| Un contrat payé non signé reste `PENDING` : ce n'est pas une anomalie, aucune alerte | user (backend vérifié) | confirmed | — |
| Un voyage impayé dont le devis expire passe `CANCELLED` sans remboursement | user | confirmed | — |
| Le rattachement en préprod appelle le vrai EVO UAT | user | confirmed | — |
| `GET /subscriptions/{id}` d'un voyage porte le bloc `travel` (`TravelContractResponse`) et `?refresh=true` ajoute `travel.evo` | mission + backend | unverified | lecture réelle en préprod (verify) |

## To ask others

- **Utilisateur :** identifiant du compte de test de la préprod, au moment de la recette.
- **NSIA (déjà listé côté backend, `questions-ouvertes.md` A.11) :** confirmer que seul l'ADMIN tranche les contrats voyage.

## Glossary

| Term | Means here | Does NOT mean |
|---|---|---|
| Trancher / décision | une des 3 actions sur un contrat `TO_RECONCILE` | changer le statut du contrat à la main |
| Remboursement | `RefundRequest` (id `RF-n`) d'un contrat voyage annulé | une ristourne d'avenant |
| Page contrat | `/contrats/{id}`, tous produits | la fiche client |

## Answers

| Question | Answer | How |
|---|---|---|
| Où s'ouvre le détail d'un contrat ? | nouvelle page `/contrats/{id}`, tous produits | decided — user |
| Que devient `ContractDrawer` ? | remplacé par la page ; clic sur un contrat de la fiche client → la page ; `?contract=` redirige | decided — user |
| Où sont les décisions ? | sur la page contrat seulement ; la liste mène à la page | decided — user |
| Que montre une alerte `REFUND_ATTENTION` ? | `/remboursements/{id}` : texte tel quel + aide-mémoire + formulaire toujours proposé ; pas de déduction depuis le texte | decided — user |
| Liste des remboursements ? | non (pas de route backend) | decided — user |
| Environnement | préprod en lecture + mocks | decided — user |
| Menu | Contrats › Supervision voyage, `/contrats/voyage` | defaulted |
| Filtre par défaut | `TO_RECONCILE`, filtre et page dans l'URL | defaulted |
| `PAYOUT_FUNDS_INSUFFICIENT` | information, sans lien | defaulted |
| 403 | « Droit insuffisant » | defaulted (mission) |
| Actions résiliation/renouvellement/sinistre/avenant | aucune n'existe au back-office ; ne pas afficher la section renouvellement d'un voyage | from code: `src/components/clients/ContractDrawer.tsx` |

## Deferred

- Rattachement réel en préprod (EVO UAT) — owner: utilisateur — needed by: verify (exécution seulement avec son accord).

## Hints for architect

- Pas de page contrat aujourd'hui : `ContractDrawer` (`src/components/clients/`) porte pièces, PDF police/avenants, quittances — à déplacer dans la page.
- `/remboursements/{id}` doit retrouver le texte de l'alerte au rechargement : pas de route de lecture → chercher la notification par `resourceId` (`GET /notifications`), ou passer le texte en state de navigation avec repli.
- La cause de `REFUND_ATTENTION` n'est que dans le texte (`RefundNotifier.java`).
- Motif de refus : vérifier la longueur de colonne backend (L-011).
- Statuts EVO, `reconcilableFrom` : `LocalDateTime` sans fuseau (UTC+0 = Abidjan).
- Client de chaque ligne de supervision : seul `clientId` est fourni.

## Revisions

- 2026-10-12 — brief initial (scope).
