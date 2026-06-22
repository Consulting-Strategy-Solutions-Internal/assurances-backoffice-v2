import type { PartnerResponse } from '#/services/partners'

interface PartnersTableProps {
  partners: PartnerResponse[]
}

export function PartnersTable({ partners }: PartnersTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Code distributeur</th>
          <th>ID site</th>
          <th>Email</th>
          <th>Localisation</th>
        </tr>
      </thead>
      <tbody>
        {partners.length === 0 ? (
          <tr>
            <td colSpan={5}>Aucun résultat.</td>
          </tr>
        ) : (
          partners.map((partner) => (
            <tr key={partner.id}>
              <td>{partner.name}</td>
              <td>{partner.distributorCode}</td>
              <td>{partner.idSite}</td>
              <td>{partner.email ?? '—'}</td>
              <td>{partner.location ?? '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
