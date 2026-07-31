import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { verifyAuth } from '#/services/auth'
import { LoginPage } from '#/components/auth/LoginPage'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    try {
      await verifyAuth()
      throw redirect({ to: '/dashboard' })
    } catch (error) {
      if (isRedirect(error)) throw error
    }
  },
  component: LoginPage,
})
