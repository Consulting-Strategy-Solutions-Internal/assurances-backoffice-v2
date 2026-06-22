import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { verifyAuth, logout, getMe, type MeResponse } from '#/services/auth'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      await verifyAuth()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isRolesOrPermissions = pathname.startsWith('/roles') || pathname.startsWith('/permissions')
  const [rolesOpen, setRolesOpen] = useState(isRolesOrPermissions)

  const { data: user } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  async function handleLogout() {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #e5e7eb' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link to="/users">Administrateurs</Link>
          </li>
          <li>
            <Link to="/partners">Partenaires</Link>
          </li>
          <li>
            <button
              onClick={() => setRolesOpen((o) => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Rôles & Permissions {rolesOpen ? '▲' : '▼'}
            </button>
            {rolesOpen && (
              <ul style={{ listStyle: 'none', padding: '0 0 0 16px', margin: 0 }}>
                <li>
                  <Link to="/roles">Rôles</Link>
                </li>
                <li>
                  <Link to="/permissions">Permissions</Link>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </nav>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{user ? `${user.firstName} ${user.lastName}` : ''}</span>
          <button onClick={handleLogout}>Se déconnecter</button>
        </header>
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
