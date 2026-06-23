import type { DrawerContent } from './DetailDrawer'
import type { ClientRow, RenouvelerRow, SinistreRow } from './mock-data'
import type { ProductRow } from '#/components/products/data'

export function sinistreDrawer(r: SinistreRow): DrawerContent {
  return {
    title: r.ref,
    subtitle: r.client,
    statut: r.statut,
    rows: [
      { label: 'Branche', value: r.branche },
      { label: 'Date de déclaration', value: r.date || 'En cours' },
      { label: 'Montant estimé', value: r.montant + ' FCFA' },
      { label: 'Gestionnaire', value: 'Serigne Mbacké' },
    ],
    actionLabel: 'Traiter le sinistre',
  }
}

export function renouvelerDrawer(r: RenouvelerRow): DrawerContent {
  return {
    title: r.client,
    subtitle: r.police,
    statut: r.statut,
    rows: [
      { label: 'Branche', value: r.branche },
      { label: 'Échéance', value: r.echeance },
      { label: 'Prime', value: r.prime + ' FCFA' },
    ],
    actionLabel: 'Renouveler le contrat',
  }
}

export function productDrawer(r: ProductRow): DrawerContent {
  return {
    title: r.nom,
    subtitle: r.code,
    statut: r.statut,
    rows: [
      { label: 'Branche', value: r.branche },
      { label: 'Catégorie', value: r.categorie },
      { label: 'Prime de base', value: r.prime + ' FCFA' },
    ],
    actionLabel: 'Voir le produit',
  }
}

export function clientDrawer(r: ClientRow): DrawerContent {
  return {
    title: r.nom,
    subtitle: r.ref,
    statut: r.statut,
    rows: [
      { label: 'Branche', value: r.branche },
      { label: 'Agence', value: r.agence },
      { label: 'Prime annuelle', value: r.prime + ' FCFA' },
    ],
    actionLabel: 'Ouvrir le dossier',
  }
}
