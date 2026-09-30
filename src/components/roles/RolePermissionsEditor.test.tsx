// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PermissionResponse, RoleResponse } from '#/services/roles'
import {
  RolePermissionsEditor,
  replaceRoleInCache,
} from './RolePermissionsEditor'

const perm = (id: number, name: string): PermissionResponse => ({
  id,
  name,
  createdAt: '',
  updatedAt: '',
})
const P1 = perm(1, 'partner:read')
const role = (permissions: PermissionResponse[]): RoleResponse => ({
  id: 7,
  name: 'ADMIN',
  permissions,
  createdAt: '',
  updatedAt: '',
})

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({
  addPermissionToRole: vi.fn(),
  removePermissionFromRole: vi.fn(),
  getPermissions: vi.fn(),
}))
vi.mock('#/services/roles', () => api)
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({ can: () => true }),
}))
vi.mock('#/components/users/use-all-users', () => ({
  useAllUsers: () => ({ data: undefined }),
}))
vi.mock('#/components/roles/PermissionMatrix', () => ({
  PermissionMatrix: (props: {
    catalog: PermissionResponse[]
    grantedIds: Set<number>
    onToggle: (p: PermissionResponse, granted: boolean) => void
  }) => (
    <button
      type="button"
      onClick={() => props.onToggle(P1, props.grantedIds.has(P1.id))}
    >
      toggle
    </button>
  ),
}))
vi.mock('#/components/dashboard/ConfirmDialog', () => ({
  ConfirmDialog: (props: { open: boolean; onConfirm: () => void }) =>
    props.open ? (
      <button type="button" onClick={props.onConfirm}>
        confirm
      </button>
    ) : null,
}))

function setup(initial: RoleResponse) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(['roles-all'], { content: [initial] })
  client.setQueryData(['roles', 'all-pages'], { items: [initial] })
  const view = render(
    <QueryClientProvider client={client}>
      <RolePermissionsEditor role={initial} />
    </QueryClientProvider>,
  )
  return { client, view }
}

beforeEach(() => {
  api.getPermissions.mockResolvedValue({ content: [P1] })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function toggleAndConfirm() {
  fireEvent.click(screen.getByText('toggle'))
  fireEvent.click(await screen.findByText('confirm'))
}

describe('RolePermissionsEditor — annulation (R1-12, L-004)', () => {
  it('écrit la réponse du serveur dans tous les caches avant de proposer Annuler', async () => {
    api.removePermissionFromRole.mockResolvedValue(role([]))
    const { client } = setup(role([P1]))
    await toggleAndConfirm()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(
      client.getQueryData<{ content: RoleResponse[] }>(['roles-all'])
        ?.content[0].permissions,
    ).toEqual([])
    expect(
      client.getQueryData<{ items: RoleResponse[] }>(['roles', 'all-pages'])
        ?.items[0].permissions,
    ).toEqual([])
  })

  it("« Annuler » un retrait ré-accorde la permission même si le refetch n'a pas fini", async () => {
    api.removePermissionFromRole.mockResolvedValue(role([]))
    api.addPermissionToRole.mockResolvedValue(role([P1]))
    setup(role([P1]))
    await toggleAndConfirm()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    const options = toast.success.mock.calls[0][1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()
    await waitFor(() =>
      expect(api.addPermissionToRole).toHaveBeenCalledWith(7, 1),
    )
    expect(toast.info).not.toHaveBeenCalled()
  })

  it("dit pourquoi l'annulation est ignorée (déjà rétablie ailleurs)", async () => {
    api.removePermissionFromRole.mockResolvedValue(role([]))
    const { client } = setup(role([P1]))
    await toggleAndConfirm()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    // Quelqu'un d'autre a déjà ré-accordé la permission entre-temps.
    client.setQueryData(['roles-all'], { content: [role([P1])] })
    const options = toast.success.mock.calls[0][1] as {
      action: { onClick: () => void }
    }
    options.action.onClick()
    expect(api.addPermissionToRole).not.toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining('Annulation ignorée'),
    )
  })
})

describe('replaceRoleInCache', () => {
  it('gère les formes { content } et { items } et ignore le reste', () => {
    const updated = role([])
    expect(replaceRoleInCache({ content: [role([P1])] }, updated)).toEqual({
      content: [updated],
    })
    expect(
      replaceRoleInCache({ items: [role([P1])], total: 1 }, updated),
    ).toEqual({ items: [updated], total: 1 })
    expect(replaceRoleInCache(undefined, updated)).toBeUndefined()
    expect(replaceRoleInCache({ other: 1 }, updated)).toEqual({ other: 1 })
  })
})
