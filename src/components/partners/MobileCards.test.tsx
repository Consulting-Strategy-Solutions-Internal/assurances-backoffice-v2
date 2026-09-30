// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PartnerResponse } from '#/services/partners'
import type { UserResponse } from '#/services/users'
import { UsersTable } from '#/components/users/UsersTable'
import { PartnersTable } from './PartnersTable'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

const partner = {
  id: 7,
  name: 'ACME Courtage',
  distributorCode: 'D-42',
  email: 'contact@acme.test',
  location: 'Abidjan',
} as PartnerResponse

const user = {
  id: 3,
  firstName: 'Awa',
  lastName: 'Kone',
  email: 'awa@nsia.test',
  role: 'ADMIN',
  phoneNumber: '+2250700000000',
  emailVerified: false,
} as UserResponse

describe('mobile cards', () => {
  afterEach(cleanup)

  it('partner card shows the key fields and opens the detail', () => {
    render(<PartnersTable partners={[partner]} />)
    // la carte (liste) et la ligne (table) portent le même libellé
    const list = document.querySelector('ul') as HTMLElement
    const inCard = within(list)
    expect(inCard.getByText('ACME Courtage')).toBeTruthy()
    expect(inCard.getByText('contact@acme.test')).toBeTruthy()
    expect(inCard.getByText('Code D-42')).toBeTruthy()
    fireEvent.click(within(list).getByText('ACME Courtage'))
    expect(navigate).toHaveBeenCalledWith({
      to: '/partners/$partnerId',
      params: { partnerId: '7' },
    })
  })

  it('admin card shows role and verification pill and triggers onSelect', () => {
    const onSelect = vi.fn()
    render(<UsersTable users={[user]} onSelect={onSelect} />)
    const list = document.querySelector('ul') as HTMLElement
    expect(within(list).getByText('Non vérifié')).toBeTruthy()
    fireEvent.click(within(list).getByText('awa@nsia.test'))
    expect(onSelect).toHaveBeenCalledWith(user)
  })
})
