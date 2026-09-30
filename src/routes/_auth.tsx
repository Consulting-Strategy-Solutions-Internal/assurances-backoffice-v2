import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { verifyAuth } from '#/services/auth'
import { AppShell } from '#/components/dashboard/AppShell'
import {
  NotFoundPage,
  RouteErrorPage,
} from '#/components/layout/RouteFallbacks'

/**
 * Page dont la session a été vérifiée en dernier, côté navigateur seulement
 * (sur le serveur, ce module est partagé entre utilisateurs). Au chargement,
 * c'est la page rendue par le serveur, qui a déjà passé ce `beforeLoad`.
 */
let verifiedPathname: string | null =
  typeof window !== 'undefined' ? window.location.pathname : null

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ cause, location }) => {
    // Changer seulement les paramètres de recherche (une frappe dans un filtre
    // lié à l'URL) ne revérifie pas la session : `verifyAuth` est une server
    // fn qui rappelle l'API, et la frappe attendait cet aller-retour — assez
    // pour perdre des lettres. Une session expirée reste interceptée par les
    // 401 de l'API (`src/lib/api.ts`).
    if (cause === 'stay' && location.pathname === verifiedPathname) return
    try {
      await verifyAuth()
      if (typeof window !== 'undefined') verifiedPathname = location.pathname
    } catch {
      verifiedPathname = null
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
