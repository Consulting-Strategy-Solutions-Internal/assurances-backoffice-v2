import type { RoleResponse } from '#/services/roles'

interface RolesTableProps {
  roles: RoleResponse[]
}

export function RolesTable({ roles }: RolesTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Description</th>
          <th>Permissions</th>
        </tr>
      </thead>
      <tbody>
        {roles.length === 0 ? (
          <tr>
            <td colSpan={3}>Aucun résultat.</td>
          </tr>
        ) : (
          roles.map((role) => (
            <tr key={role.id}>
              <td>{role.name}</td>
              <td>{role.description ?? '—'}</td>
              <td>{role.permissions.map((p) => p.name).join(', ') || '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
