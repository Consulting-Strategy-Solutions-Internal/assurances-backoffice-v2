import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/produits-ia/ia-standard/')({
  beforeLoad: () => {
    throw redirect({ to: '/produits-ia/ia-standard/classes', replace: true })
  },
})
