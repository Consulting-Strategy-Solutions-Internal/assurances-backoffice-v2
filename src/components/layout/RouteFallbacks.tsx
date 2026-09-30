import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Compass, TriangleAlert } from 'lucide-react'
import { AppShell } from '#/components/dashboard/AppShell'
import { useInsideShell } from '#/components/dashboard/shell'
import { verifyAuth } from '#/services/auth'
import { Button } from '#/components/ui/button'
import { EmptyState } from './EmptyState'

function Frame({
  standalone,
  children,
}: {
  standalone?: boolean
  children: ReactNode
}) {
  if (!standalone) return <div className="pt-6">{children}</div>
  return <StandaloneFrame>{children}</StandaloneFrame>
}

/**
 * Root-level fallback (unknown URL, error outside the `_auth` layout): shown
 * inside the app shell when the user is signed in, on a bare page otherwise.
 */
function StandaloneFrame({ children }: { children: ReactNode }) {
  // Already inside the `_auth` shell (error in a child route): render once, in place.
  const insideShell = useInsideShell()
  const { data: signedIn, isPending } = useQuery({
    queryKey: ['auth-check'],
    queryFn: async () => {
      try {
        await verifyAuth()
        return true
      } catch {
        return false
      }
    },
    retry: false,
    staleTime: 30_000,
    enabled: !insideShell,
  })
  if (insideShell) return <div className="pt-6">{children}</div>
  if (signedIn)
    return (
      <AppShell>
        <div className="pt-6">{children}</div>
      </AppShell>
    )
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        className={isPending ? 'invisible w-full max-w-lg' : 'w-full max-w-lg'}
      >
        {children}
      </div>
    </div>
  )
}

/** 404 — inside the shell (`_auth`) or, with `standalone`, on a bare page. */
export function NotFoundPage({ standalone }: { standalone?: boolean }) {
  return (
    <Frame standalone={standalone}>
      <EmptyState
        variant="card"
        icon={Compass}
        title="Page introuvable."
        description="L’adresse demandée n’existe pas ou a été déplacée."
        action={
          <Button asChild className="rounded-[11px]">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        }
      />
    </Frame>
  )
}

/** Uncaught render/loader error. The raw message is only shown in development. */
export function RouteErrorPage({
  error,
  reset,
  standalone,
}: {
  error: unknown
  reset?: () => void
  standalone?: boolean
}) {
  const router = useRouter()
  const message = error instanceof Error ? error.message : ''
  return (
    <Frame standalone={standalone}>
      <EmptyState
        variant="card"
        icon={TriangleAlert}
        tone="error"
        title="Une erreur est survenue."
        description={
          import.meta.env.DEV && message
            ? message
            : 'La page n’a pas pu s’afficher. Réessayez ou revenez au tableau de bord.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="rounded-[11px]"
              onClick={() => {
                reset?.()
                void router.invalidate()
              }}
            >
              Réessayer
            </Button>
            <Button asChild className="rounded-[11px]">
              <Link to="/dashboard">Retour au tableau de bord</Link>
            </Button>
          </div>
        }
      />
    </Frame>
  )
}
