import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { verifyAuth } from '#/services/auth'
import { AppShell } from '#/components/dashboard/AppShell'
import {
  NotFoundPage,
  RouteErrorPage,
} from '#/components/layout/RouteFallbacks'

/** Durée pendant laquelle une page vérifiée ne l'est pas de nouveau. */
const VERIFIED_FOR_MS = 60_000

/**
 * Pages dont la session a été vérifiée, et quand — côté navigateur seulement
 * (sur le serveur, ce module est partagé entre utilisateurs). Au chargement,
 * la page rendue par le serveur a déjà passé ce `beforeLoad`.
 */
const verifiedAt = new Map<string, number>()
if (typeof window !== 'undefined') {
  verifiedAt.set(window.location.pathname, Date.now())
}
/** Vérification en cours : les navigations qui arrivent pendant l'attendent. */
let pending: Promise<unknown> | null = null

function recentlyVerified(pathname: string): boolean {
  const at = verifiedAt.get(pathname)
  return at !== undefined && Date.now() - at < VERIFIED_FOR_MS
}

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ cause, location }) => {
    // Une frappe dans un filtre lié à l'URL est une navigation `stay` : elle ne
    // revérifie pas une page vérifiée il y a moins d'une minute (`verifyAuth`
    // est une server fn qui rappelle l'API ; la frappe attendait cet
    // aller-retour). Le préchargement au survol d'un lien arrive aussi en
    // `stay`, vers une autre page : il ajoute cette page sans oublier l'actuelle.
    // Une session expirée reste interceptée par les 401 de l'API
    // (`src/lib/api.ts`).
    const browser = typeof window !== 'undefined'
    if (browser && cause === 'stay' && recentlyVerified(location.pathname)) {
      return
    }
    try {
      if (browser) {
        pending ??= verifyAuth().finally(() => (pending = null))
        await pending
        verifiedAt.set(location.pathname, Date.now())
      } else {
        await verifyAuth()
      }
    } catch {
      verifiedAt.clear()
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
