import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { logout, getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'
import { ShellProvider } from '#/components/dashboard/shell'
import { Sidebar } from '#/components/dashboard/Sidebar'
import { Topbar } from '#/components/dashboard/Topbar'
import { Toaster } from '#/components/ui/sonner'

/** Authenticated layout: sidebar + topbar + scrollable `#main` column. */
export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  async function handleLogout() {
    // The HttpOnly auth cookies are cleared server-side by /auth/logout; we
    // can only react to it client-side. Purge the cache and redirect in a
    // `finally` so a logout that fails (network/500) still drops the user's
    // in-memory data and bounces them out, never stranding them logged-in.
    try {
      await logout()
    } finally {
      queryClient.clear()
      navigate({ to: '/login' })
    }
  }

  return (
    <ShellProvider>
      <a
        href="#main"
        className="sr-only z-[60] rounded-[11px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <div className="flex h-dvh overflow-hidden bg-background">
        <Sidebar user={user} onLogout={handleLogout} />
        <main
          id="main"
          tabIndex={-1}
          className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none"
        >
          <Topbar />
          {/* `@container/main`: layout primitives (KpiRow, Toolbar, DataTable
              hideBelow…) react to the width of THIS column, not the viewport, so
              1024 px with the menu open behaves like a 700 px layout. */}
          <div className="@container/main w-full max-w-[1360px] flex-1 px-4 pt-7 pb-[52px] md:px-[34px]">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </ShellProvider>
  )
}
