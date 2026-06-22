import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { verifyAuth, logout } from '#/services/auth'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    try {
      await verifyAuth()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleLogout}>Se déconnecter</button>
    </div>
  )
}
