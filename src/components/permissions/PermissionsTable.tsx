import type { PermissionResponse } from '#/services/roles'

interface PermissionsTableProps {
  permissions: PermissionResponse[]
}

export function PermissionsTable({ permissions }: PermissionsTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Nom</th>
        </tr>
      </thead>
      <tbody>
        {permissions.length === 0 ? (
          <tr>
            <td>Aucun résultat.</td>
          </tr>
        ) : (
          permissions.map((permission) => (
            <tr key={permission.id}>
              <td>{permission.name}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
