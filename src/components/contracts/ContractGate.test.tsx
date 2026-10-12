// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContractGate } from './ContractGate'

const mocks = vi.hoisted(() => ({ permissions: null as Set<string> | null }))

vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({ permissions: mocks.permissions }),
}))

afterEach(cleanup)

function renderGate() {
  render(
    <ContractGate>
      <p>contenu</p>
    </ContractGate>,
  )
}

describe('ContractGate (R1-3, L-009)', () => {
  it('droits inconnus (null) : la page passe, le serveur tranche', () => {
    mocks.permissions = null
    renderGate()
    expect(screen.getByText('contenu')).toBeTruthy()
  })

  it('subscription:read-all connu et absent : Droit insuffisant', () => {
    mocks.permissions = new Set(['amendment:read-all'])
    renderGate()
    expect(screen.getByText('Droit insuffisant')).toBeTruthy()
    expect(screen.queryByText('contenu')).toBeNull()
  })

  it('droit présent : la page passe', () => {
    mocks.permissions = new Set(['subscription:read-all'])
    renderGate()
    expect(screen.getByText('contenu')).toBeTruthy()
  })
})
