import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { verifyAuth } from '#/services/auth'
import { AppShell } from '#/components/dashboard/AppShell'
import {
  NotFoundPage,
  RouteErrorPage,
} from '#/components/layout/RouteFallbacks'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      await verifyAuth()
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthLayout,
  notFoundComponent: () => <NotFoundPage />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorPage error={error} reset={reset} />
  ),
})

function AuthLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
