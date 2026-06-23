import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { verifyAuth, logout, getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'
import { ShellProvider } from '#/components/dashboard/shell'
import { Sidebar } from '#/components/dashboard/Sidebar'
import { Topbar } from '#/components/dashboard/Topbar'
import { Toaster } from '#/components/ui/sonner'

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

  const { data: user } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  async function handleLogout() {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <ShellProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex h-screen flex-1 flex-col overflow-y-auto">
          <Topbar />
          <div className="w-full max-w-[1360px] flex-1 px-[34px] pt-7 pb-[52px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </ShellProvider>
  )
}
