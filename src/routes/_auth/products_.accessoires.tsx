import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/products_/accessoires')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/products_/accessoires"!</div>
}
