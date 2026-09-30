// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { HeaderActionPortal, HeaderActionSlot } from './header-action'

afterEach(cleanup)

it('rend l’action dans l’emplacement de l’en-tête quand il existe', async () => {
  const { container } = render(
    <>
      <header data-testid="header">
        <HeaderActionSlot />
      </header>
      <main>
        <HeaderActionPortal>
          <button type="button">Nouvelle règle</button>
        </HeaderActionPortal>
      </main>
    </>,
  )
  const button = await screen.findByRole('button', { name: 'Nouvelle règle' })
  expect(within(screen.getByTestId('header')).getByRole('button')).toBe(button)
  expect(container.querySelector('main button')).toBeNull()
})

it('sans emplacement, rend l’action en ligne', async () => {
  const { container } = render(
    <main>
      <HeaderActionPortal>
        <button type="button">Nouvelle règle</button>
      </HeaderActionPortal>
    </main>,
  )
  await screen.findByRole('button', { name: 'Nouvelle règle' })
  expect(container.querySelector('main button')).not.toBeNull()
})
