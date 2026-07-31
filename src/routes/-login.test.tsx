// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { LoginPage } from '#/components/auth/LoginPage'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  isRedirect: () => false,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  redirect: vi.fn(),
  useNavigate: () => mocks.navigate,
}))

vi.mock('#/services/auth', () => ({
  login: mocks.login,
  verifyAuth: vi.fn(),
}))

afterEach(() => {
  cleanup()
  mocks.login.mockReset()
  mocks.navigate.mockReset()
})

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Email*'), {
    target: { value: 'admin@nsia.ci' },
  })
  fireEvent.change(screen.getByLabelText('Mot de passe*'), {
    target: { value: 'password123' },
  })
}

describe('LoginPage', () => {
  it('revalidates both fields while correcting errors after submission', async () => {
    render(<LoginPage />)

    const email = screen.getByLabelText('Email*')
    const password = screen.getByLabelText('Mot de passe*')

    fireEvent.submit(
      screen.getByRole('button', { name: 'Se connecter' }).closest('form')!,
    )

    expect(
      (await screen.findByText("L'email est requis")).getAttribute('role'),
    ).toBe('alert')
    expect(
      screen.getByText('Le mot de passe est requis').getAttribute('role'),
    ).toBe('alert')
    expect(email.getAttribute('aria-required')).toBe('true')
    expect(email.getAttribute('aria-describedby')).toBe('email-error')
    expect(password.getAttribute('aria-describedby')).toBe(
      'password-error',
    )

    fireEvent.change(email, { target: { value: 'admin@nsia.ci' } })
    fireEvent.change(password, { target: { value: 'password123' } })

    await waitFor(() => {
      expect(screen.queryByText("L'email est requis")).toBeNull()
      expect(screen.queryByText('Le mot de passe est requis')).toBeNull()
    })
  })

  it('clears an authentication error when either credential changes', async () => {
    mocks.login.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    })
    render(<LoginPage />)
    fillCredentials()

    fireEvent.submit(
      screen.getByRole('button', { name: 'Se connecter' }).closest('form')!,
    )

    await screen.findByText('Email ou mot de passe incorrect.')

    fireEvent.change(screen.getByLabelText('Email*'), {
      target: { value: 'autre@nsia.ci' },
    })

    expect(screen.queryByText('Email ou mot de passe incorrect.')).toBeNull()
  })

  it('reports an Axios error without a response as a network failure', async () => {
    mocks.login.mockRejectedValue({ isAxiosError: true })
    render(<LoginPage />)
    fillCredentials()

    fireEvent.submit(
      screen.getByRole('button', { name: 'Se connecter' }).closest('form')!,
    )

    await screen.findByText('Impossible de contacter le serveur.')
  })
})
