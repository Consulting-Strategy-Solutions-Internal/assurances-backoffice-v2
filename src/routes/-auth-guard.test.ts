// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ verifyAuth: vi.fn() }))

vi.mock('#/services/auth', () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock('#/components/dashboard/AppShell', () => ({ AppShell: () => null }))
vi.mock('#/components/layout/RouteFallbacks', () => ({
  NotFoundPage: () => null,
  RouteErrorPage: () => null,
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Outlet: () => null,
  redirect: (opts: unknown) => ({ redirect: opts }),
  lazyRouteComponent: () => () => null,
}))

type BeforeLoad = (ctx: {
  cause: 'enter' | 'stay' | 'preload'
  location: { pathname: string }
}) => Promise<void>

async function guard() {
  vi.resetModules()
  const { Route } = await import('./_auth')
  return (Route as unknown as { options: { beforeLoad: BeforeLoad } }).options
    .beforeLoad
}

beforeEach(() => {
  mocks.verifyAuth.mockReset()
  mocks.verifyAuth.mockResolvedValue({ id: 1 })
})

describe('_auth beforeLoad (fix client-search-lag)', () => {
  it('vérifie la session à l’entrée', async () => {
    const beforeLoad = await guard()
    await beforeLoad({ cause: 'enter', location: { pathname: '/clients' } })
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(1)
  })

  it('ne rappelle pas le serveur quand seuls les paramètres de recherche changent (une frappe = une navigation)', async () => {
    const beforeLoad = await guard()
    await beforeLoad({ cause: 'enter', location: { pathname: '/clients' } })
    for (let i = 0; i < 7; i++) {
      await beforeLoad({ cause: 'stay', location: { pathname: '/clients' } })
    }
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(1)
  })

  it('page rendue par le serveur : les frappes suivantes ne rappellent pas le serveur', async () => {
    window.history.replaceState(null, '', '/clients')
    const beforeLoad = await guard()
    for (let i = 0; i < 7; i++) {
      await beforeLoad({ cause: 'stay', location: { pathname: '/clients' } })
    }
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '/')
  })

  it('revérifie en changeant de page', async () => {
    const beforeLoad = await guard()
    await beforeLoad({ cause: 'enter', location: { pathname: '/clients' } })
    await beforeLoad({ cause: 'stay', location: { pathname: '/partners' } })
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(2)
  })

  it('session refusée : redirige vers /login et revérifie la fois suivante', async () => {
    const beforeLoad = await guard()
    mocks.verifyAuth.mockRejectedValueOnce(new Error('401'))
    await expect(
      beforeLoad({ cause: 'enter', location: { pathname: '/clients' } }),
    ).rejects.toEqual({ redirect: { to: '/login' } })
    await beforeLoad({ cause: 'stay', location: { pathname: '/clients' } })
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(2)
  })
})

describe('_auth beforeLoad côté serveur', () => {
  it('ne mémorise rien sans window (module partagé entre utilisateurs)', async () => {
    const beforeLoad = await guard()
    vi.stubGlobal('window', undefined)
    try {
      await beforeLoad({ cause: 'enter', location: { pathname: '/clients' } })
      await beforeLoad({ cause: 'stay', location: { pathname: '/clients' } })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(mocks.verifyAuth).toHaveBeenCalledTimes(2)
  })
})
