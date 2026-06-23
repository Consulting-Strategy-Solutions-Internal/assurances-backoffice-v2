/**
 * Static demo data for the Produits / Catégories / Grille tarifaire screens.
 * Not yet wired to the API; swap for service calls when endpoints exist.
 */

export interface ProductRow {
  code: string
  nom: string
  branche: string
  categorie: string
  prime: string
  statut: string
}

export interface CategoryRow {
  nom: string
  branche: string
  produits: number
  statut: string
}

export interface TarifRow {
  produit: string
  formule: string
  couverture: string
  mensuel: string
  annuel: string
}

export const PRODUITS: ProductRow[] = [
  { code: 'PRD-AUTO-TR', nom: 'Auto Tous Risques', branche: 'Automobile', categorie: 'Auto Particuliers', prime: '420 000', statut: 'Actif' },
  { code: 'PRD-AUTO-TI', nom: 'Auto au Tiers', branche: 'Automobile', categorie: 'Auto Particuliers', prime: '180 000', statut: 'Actif' },
  { code: 'PRD-SANTE-FAM', nom: 'Santé Famille', branche: 'Santé', categorie: 'Santé Individuelle', prime: '540 000', statut: 'Actif' },
  { code: 'PRD-MRH', nom: 'Multirisque Habitation', branche: 'Habitation', categorie: 'Habitation', prime: '310 000', statut: 'Actif' },
  { code: 'PRD-MRE', nom: 'Multirisque Entreprise', branche: 'Dommages', categorie: 'Entreprises', prime: '9 800 000', statut: 'Actif' },
  { code: 'PRD-VIE-EP', nom: 'Assurance Vie Épargne', branche: 'Vie', categorie: 'Prévoyance & Vie', prime: '1 150 000', statut: 'Actif' },
  { code: 'PRD-FLOTTE', nom: 'Flotte Auto Pro', branche: 'Automobile', categorie: 'Auto Entreprises', prime: '4 200 000', statut: 'En attente' },
  { code: 'PRD-VOY', nom: 'Voyage & Assistance', branche: 'Assistance', categorie: 'Voyage & Assistance', prime: '95 000', statut: 'Inactif' },
]

export const CATEGORIES: CategoryRow[] = [
  { nom: 'Auto Particuliers', branche: 'Automobile', produits: 4, statut: 'Actif' },
  { nom: 'Auto Entreprises', branche: 'Automobile', produits: 2, statut: 'Actif' },
  { nom: 'Santé Individuelle', branche: 'Santé', produits: 3, statut: 'Actif' },
  { nom: 'Prévoyance & Vie', branche: 'Vie', produits: 2, statut: 'Actif' },
  { nom: 'Habitation', branche: 'Habitation', produits: 2, statut: 'Actif' },
  { nom: 'Entreprises', branche: 'Dommages', produits: 5, statut: 'Actif' },
  { nom: 'Voyage & Assistance', branche: 'Assistance', produits: 1, statut: 'En attente' },
]

export const FORMULES = ['Toutes', 'Essentiel', 'Confort', 'Premium'] as const
export type Formule = (typeof FORMULES)[number]

export const TARIFS: TarifRow[] = [
  { produit: 'Auto Tous Risques', formule: 'Essentiel', couverture: 'RC + Vol + Incendie', mensuel: '28 000', annuel: '320 000' },
  { produit: 'Auto Tous Risques', formule: 'Confort', couverture: 'Tous risques + Bris de glace', mensuel: '38 000', annuel: '420 000' },
  { produit: 'Auto Tous Risques', formule: 'Premium', couverture: 'Tous risques + Assistance 0 km', mensuel: '52 000', annuel: '580 000' },
  { produit: 'Santé Famille', formule: 'Essentiel', couverture: 'Hospitalisation', mensuel: '24 000', annuel: '270 000' },
  { produit: 'Santé Famille', formule: 'Confort', couverture: 'Hospitalisation + Soins courants', mensuel: '46 000', annuel: '540 000' },
  { produit: 'Santé Famille', formule: 'Premium', couverture: 'Couverture intégrale + Dentaire/Optique', mensuel: '72 000', annuel: '820 000' },
  { produit: 'Multirisque Habitation', formule: 'Essentiel', couverture: 'Incendie + Dégât des eaux', mensuel: '14 000', annuel: '160 000' },
  { produit: 'Multirisque Habitation', formule: 'Confort', couverture: 'Multirisque + Vol', mensuel: '26 000', annuel: '310 000' },
  { produit: 'Assurance Vie Épargne', formule: 'Confort', couverture: 'Capital + Rente', mensuel: '95 000', annuel: '1 150 000' },
  { produit: 'Voyage & Assistance', formule: 'Essentiel', couverture: 'Assistance + Rapatriement', mensuel: '8 000', annuel: '95 000' },
]
