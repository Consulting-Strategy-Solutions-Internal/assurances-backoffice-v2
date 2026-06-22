import { createFileRoute, redirect } from '@tanstack/react-router'
import { verifyAuth } from '#/services/auth'

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
  return <h1>Dashboard</h1>
}
