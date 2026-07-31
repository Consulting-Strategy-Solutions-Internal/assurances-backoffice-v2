// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ClaimActionDialog } from './ClaimActionDialog'

vi.mock('#/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

afterEach(cleanup)

describe('ClaimActionDialog', () => {
  it.each([
    ['request-info', 'Envoyer la demande', 'Le commentaire est obligatoire.'],
    ['reject', 'Rejeter', 'Le motif du rejet est obligatoire.'],
  ] as const)('requires a comment for %s', (action, button, message) => {
    const onConfirm = vi.fn()
    render(
      <ClaimActionDialog
        action={action}
        pending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    fireEvent.change(screen.getByLabelText('Commentaire *'), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: button }))

    expect(screen.getByRole('alert').textContent).toBe(message)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('limits comments to 1000 characters and reports the current length', () => {
    render(
      <ClaimActionDialog
        action="approve"
        pending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    const comment = screen.getByLabelText('Commentaire (optionnel)')

    expect(comment.getAttribute('maxlength')).toBe('1000')
    fireEvent.change(comment, { target: { value: 'a'.repeat(1000) } })
    expect(screen.getByText('1000/1000')).toBeTruthy()
  })
})
