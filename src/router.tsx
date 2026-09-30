import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import {
  NotFoundPage,
  RouteErrorPage,
} from '#/components/layout/RouteFallbacks'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage standalone />,
    defaultErrorComponent: ({ error, reset }) => (
      <RouteErrorPage error={error} reset={reset} standalone />
    ),
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
