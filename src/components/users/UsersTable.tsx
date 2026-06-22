import type { UserResponse } from '#/services/users'

interface UsersTableProps {
  users: UserResponse[]
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>Prénom</th>
          <th>Nom</th>
          <th>Email</th>
          <th>Téléphone</th>
          <th>Rôle</th>
          <th>Email vérifié</th>
        </tr>
      </thead>
      <tbody>
        {users.length === 0 ? (
          <tr>
            <td colSpan={6}>Aucun résultat.</td>
          </tr>
        ) : (
          users.map((user) => (
            <tr key={user.id}>
              <td>{user.firstName}</td>
              <td>{user.lastName}</td>
              <td>{user.email}</td>
              <td>{user.phoneNumber}</td>
              <td>{user.role}</td>
              <td>{user.emailVerified ? 'Oui' : 'Non'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
