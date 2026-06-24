/**
 * Static demo data translated from the "NSIA Dashboard" Claude Design source.
 * These screens are not yet wired to the API; replace these arrays with
 * service calls (see src/services/*) when the endpoints are available.
 */

export interface SinistreRow {
  ref: string
  client: string
  branche: string
  date?: string
  montant: string
  statut: string
}

export interface RenouvelerRow {
  client: string
  police: string
  branche: string
  echeance: string
  prime: string
  statut: string
}

export interface ClientRow {
  nom: string
  ref: string
  branche: string
  agence: string
  prime: string
  statut: string
  initials: string
  color: string
}

export const SIN_TRAITER: SinistreRow[] = [
  { ref: 'SIN-24-0912', client: 'Awa Diop', branche: 'Automobile', montant: '1 850 000', statut: 'En expertise' },
  { ref: 'SIN-24-0908', client: 'Mamadou Bâ', branche: 'Habitation', montant: '940 000', statut: 'Déclaré' },
  { ref: 'SIN-24-0901', client: 'Groupe Sococim', branche: 'Multirisque', montant: '12 400 000', statut: 'En expertise' },
  { ref: 'SIN-24-0897', client: 'Fatou Ndiaye', branche: 'Santé', montant: '320 000', statut: 'Validé' },
  { ref: 'SIN-24-0890', client: 'Ibrahima Sow', branche: 'Automobile', montant: '2 100 000', statut: 'Rejeté' },
]

export const SINISTRES: SinistreRow[] = [
  { ref: 'SIN-24-0912', client: 'Awa Diop', branche: 'Automobile', date: '12 juin 2026', montant: '1 850 000', statut: 'En expertise' },
  { ref: 'SIN-24-0908', client: 'Mamadou Bâ', branche: 'Habitation', date: '11 juin 2026', montant: '940 000', statut: 'Déclaré' },
  { ref: 'SIN-24-0901', client: 'Groupe Sococim', branche: 'Multirisque', date: '10 juin 2026', montant: '12 400 000', statut: 'En expertise' },
  { ref: 'SIN-24-0897', client: 'Fatou Ndiaye', branche: 'Santé', date: '9 juin 2026', montant: '320 000', statut: 'Validé' },
  { ref: 'SIN-24-0890', client: 'Ibrahima Sow', branche: 'Automobile', date: '8 juin 2026', montant: '2 100 000', statut: 'Rejeté' },
  { ref: 'SIN-24-0884', client: 'Aïssatou Fall', branche: 'Santé', date: '7 juin 2026', montant: '560 000', statut: 'Réglé' },
  { ref: 'SIN-24-0879', client: 'SARL Téranga', branche: 'Flotte Auto', date: '5 juin 2026', montant: '4 320 000', statut: 'Réglé' },
  { ref: 'SIN-24-0871', client: 'Cheikh Diouf', branche: 'Assurance Vie', date: '4 juin 2026', montant: '8 900 000', statut: 'Déclaré' },
  { ref: 'SIN-24-0865', client: 'Ets Ndoye & Fils', branche: 'Multirisque', date: '2 juin 2026', montant: '1 240 000', statut: 'Réglé' },
]

export const RENOUVELER: RenouvelerRow[] = [
  { client: 'SARL Téranga', police: 'AUTO-88231', branche: 'Flotte Auto', echeance: '30 juin 2026', prime: '4 200 000', statut: 'En attente' },
  { client: 'Aïssatou Fall', police: 'SANTE-21904', branche: 'Santé', echeance: '02 juil. 2026', prime: '680 000', statut: 'En attente' },
  { client: 'Cheikh Diouf', police: 'VIE-10477', branche: 'Assurance Vie', echeance: '05 juil. 2026', prime: '1 150 000', statut: 'Actif' },
  { client: 'Ets Ndoye & Fils', police: 'MRH-55012', branche: 'Multirisque', echeance: '08 juil. 2026', prime: '3 600 000', statut: 'En attente' },
]

export const CLIENTS: ClientRow[] = [
  { nom: 'Awa Diop', ref: 'CLI-10428', branche: 'Automobile', agence: 'Agence Plateau', prime: '420 000', statut: 'Actif', initials: 'AD', color: '#00337F' },
  { nom: 'Groupe Sococim', ref: 'CLI-10410', branche: 'Multirisque Ent.', agence: 'Siège Dakar', prime: '9 800 000', statut: 'Actif', initials: 'GS', color: '#1f53b0' },
  { nom: 'Mamadou Bâ', ref: 'CLI-10399', branche: 'Habitation', agence: 'Agence Thiès', prime: '310 000', statut: 'En attente', initials: 'MB', color: '#b07908' },
  { nom: 'Fatou Ndiaye', ref: 'CLI-10387', branche: 'Santé', agence: 'Agence Plateau', prime: '540 000', statut: 'Actif', initials: 'FN', color: '#1c8a57' },
  { nom: 'SARL Téranga', ref: 'CLI-10366', branche: 'Flotte Auto', agence: 'Siège Dakar', prime: '4 200 000', statut: 'Actif', initials: 'ST', color: '#5a4fb0' },
  { nom: 'Ibrahima Sow', ref: 'CLI-10341', branche: 'Automobile', agence: 'Agence Thiès', prime: '380 000', statut: 'Résilié', initials: 'IS', color: '#c0392b' },
  { nom: 'Cheikh Diouf', ref: 'CLI-10328', branche: 'Assurance Vie', agence: 'Bancassurance UBA', prime: '1 150 000', statut: 'Actif', initials: 'CD', color: '#00337F' },
  { nom: 'Aïssatou Fall', ref: 'CLI-10312', branche: 'Santé', agence: 'Agence Plateau', prime: '680 000', statut: 'En attente', initials: 'AF', color: '#b07908' },
]

/** Top partenaires bars on the overview (value is the contract count, pct the bar width). */
export const TOP_PARTENAIRES = [
  { nom: 'Cabinet Téranga Courtage', value: '2 140', pct: 92, gold: false },
  { nom: 'Agence Plateau', value: '1 680', pct: 74, gold: false },
  { nom: 'Bancassurance UBA', value: '1 320', pct: 58, gold: true },
  { nom: 'Agence Thiès', value: '940', pct: 41, gold: true },
] as const

/** Portfolio split donut (conic-gradient stops + legend). */
export const REPARTITION = [
  { label: 'Automobile', pct: 38, color: '#00337F' },
  { label: 'Santé', pct: 24, color: '#FFC61E' },
  { label: 'Vie', pct: 18, color: '#4f7fcf' },
  { label: 'Habitation', pct: 12, color: '#2aa06b' },
  { label: 'Autres', pct: 8, color: '#dde2ea' },
] as const

/** 12-month primes-vs-sinistres bar heights (px), Jul → Jun. */
export const MONTHLY_FLOW = [
  { mois: 'Jul', primes: 120, sinistres: 70 },
  { mois: 'Aoû', primes: 138, sinistres: 82 },
  { mois: 'Sep', primes: 112, sinistres: 64 },
  { mois: 'Oct', primes: 150, sinistres: 92 },
  { mois: 'Nov', primes: 142, sinistres: 80 },
  { mois: 'Déc', primes: 168, sinistres: 108 },
  { mois: 'Jan', primes: 160, sinistres: 96 },
  { mois: 'Fév', primes: 176, sinistres: 118 },
  { mois: 'Mar', primes: 158, sinistres: 100 },
  { mois: 'Avr', primes: 182, sinistres: 112 },
  { mois: 'Mai', primes: 170, sinistres: 104 },
  { mois: 'Jun', primes: 188, sinistres: 124 },
] as const
