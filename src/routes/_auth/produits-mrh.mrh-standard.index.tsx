import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/produits-mrh/mrh-standard/')({
  beforeLoad: () => {
    throw redirect({
      to: '/produits-mrh/mrh-standard/situations',
      replace: true,
    })
  },
})
