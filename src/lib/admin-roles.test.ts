import { describe, expect, it } from 'vitest'
import {
  formatRoleName,
  isAdminRole,
  isAdminRoleEntity,
  makeAdminRolePredicate,
  isPlaceholderPhone,
} from './admin-roles'

describe('admin-roles', () => {
  it('keeps only internal roles', () => {
    expect(isAdminRole('ADMIN')).toBe(true)
    expect(isAdminRole('SUPPORT')).toBe(true)
    for (const r of ['CLIENT', 'AGENT', 'MANAGER', 'DEVELOPER'])
      expect(isAdminRole(r)).toBe(false)
  })
  it('isAdminRoleEntity se base sur system / userAssignable (R1-41)', () => {
    expect(
      isAdminRoleEntity({ name: 'ADMIN', system: false, userAssignable: true }),
    ).toBe(true)
    // rôle créé par l'API, quel que soit son nom
    expect(
      isAdminRoleEntity({
        name: 'AGENT_N2',
        system: false,
        userAssignable: true,
      }),
    ).toBe(true)
    for (const name of ['CLIENT', 'AGENT'])
      expect(
        isAdminRoleEntity({ name, system: true, userAssignable: false }),
      ).toBe(false)
    for (const name of ['MANAGER', 'DEVELOPER'])
      expect(
        isAdminRoleEntity({ name, system: true, userAssignable: true }),
      ).toBe(false)
  })
  it('isAdminRoleEntity retombe sur le nom sans les champs', () => {
    expect(isAdminRoleEntity({ name: 'SUPPORT' })).toBe(true)
    expect(isAdminRoleEntity({ name: 'CLIENT' })).toBe(false)
  })
  it('formats role names', () => {
    expect(formatRoleName('ADMIN')).toBe('Administrateur')
    expect(formatRoleName('SUPPORT_N2')).toBe('Support n2')
    expect(formatRoleName('Comptable')).toBe('Comptable')
  })
  it('detects placeholder phones', () => {
    expect(isPlaceholderPhone('0000000000')).toBe(true)
    expect(isPlaceholderPhone('')).toBe(true)
    expect(isPlaceholderPhone('0709090909')).toBe(false)
  })
})

describe('makeAdminRolePredicate (R2-7)', () => {
  const role = (name: string, system: boolean, userAssignable: boolean) =>
    ({ name, system, userAssignable }) as never
  it('résout le nom via la liste des rôles (règle entité)', () => {
    const isAdmin = makeAdminRolePredicate([
      role('COMPTABLE', false, true),
      role('AUDITEUR', true, false),
    ])
    expect(isAdmin('comptable')).toBe(true)
    // rôle système : refusé même si le nom n'est pas « externe »
    expect(isAdmin('AUDITEUR')).toBe(false)
  })
  it('retombe sur le nom quand les rôles sont inconnus ou le rôle absent', () => {
    expect(makeAdminRolePredicate(undefined)('SUPPORT')).toBe(true)
    expect(makeAdminRolePredicate(undefined)('CLIENT')).toBe(false)
    expect(makeAdminRolePredicate([])('MANAGER')).toBe(false)
  })
})
