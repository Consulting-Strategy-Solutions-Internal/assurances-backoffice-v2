// @vitest-environment jsdom

import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToolbarSearch } from './Toolbar'

afterEach(cleanup)

/**
 * Parent dont la valeur (l'URL) ne suit qu'en différé, comme une navigation
 * TanStack Router : `value` reste l'ancienne pendant la frappe.
 */
function LaggingParent({ onCommit }: { onCommit?: (v: string) => void }) {
  const [url, setUrl] = useState('')
  return (
    <>
      <ToolbarSearch
        label="Rechercher"
        placeholder=""
        value={url}
        onChange={(v) => {
          onCommit?.(v)
          setTimeout(() => setUrl(v), 50)
        }}
      />
      <button type="button" onClick={() => setUrl('')}>
        Réinitialiser
      </button>
    </>
  )
}

function typeInto(input: HTMLInputElement, text: string) {
  for (const ch of text) {
    fireEvent.change(input, { target: { value: input.value + ch } })
  }
}

describe('ToolbarSearch (fix client-search-lag)', () => {
  it('garde toutes les lettres tapées vite quand la valeur du parent suit en retard', async () => {
    render(<LaggingParent />)
    const input = screen.getByLabelText<HTMLInputElement>('Rechercher')
    input.focus()
    typeInto(input, 'kouassi')
    expect(input.value).toBe('kouassi')
    await act(() => new Promise((r) => setTimeout(r, 120)))
    expect(input.value).toBe('kouassi')
  })

  it('R1 : suit Précédent/Suivant même quand le champ a le focus', async () => {
    function Parent() {
      const [url, setUrl] = useState('abc')
      return (
        <>
          <ToolbarSearch
            label="Rechercher"
            placeholder=""
            value={url}
            onChange={(v) => setTimeout(() => setUrl(v), 20)}
          />
          <button type="button" onClick={() => setUrl('ancien')}>
            Précédent
          </button>
        </>
      )
    }
    render(<Parent />)
    const input = screen.getByLabelText<HTMLInputElement>('Rechercher')
    input.focus()
    typeInto(input, 'd')
    await act(() => new Promise((r) => setTimeout(r, 60)))
    // Précédent sans perdre le focus (bouton de souris, Alt+←).
    fireEvent.click(screen.getByText('Précédent'))
    expect(input.value).toBe('ancien')
  })

  it('R1 : Précédent vers une valeur intermédiaire déjà tapée (« ko ») est suivi', async () => {
    function Parent() {
      const [url, setUrl] = useState('')
      return (
        <>
          <ToolbarSearch
            label="Rechercher"
            placeholder=""
            value={url}
            // Le routeur regroupe les navigations : seule la dernière arrive.
            onChange={(v) => v === 'kou' && setTimeout(() => setUrl(v), 20)}
          />
          <button type="button" onClick={() => setUrl('ko')}>
            Précédent
          </button>
        </>
      )
    }
    render(<Parent />)
    const input = screen.getByLabelText<HTMLInputElement>('Rechercher')
    typeInto(input, 'kou')
    await act(() => new Promise((r) => setTimeout(r, 60)))
    fireEvent.click(screen.getByText('Précédent'))
    expect(input.value).toBe('ko')
  })

  it('suit une remise à zéro venue du parent (bouton Réinitialiser)', async () => {
    render(<LaggingParent />)
    const input = screen.getByLabelText<HTMLInputElement>('Rechercher')
    input.focus()
    typeInto(input, 'abc')
    await act(() => new Promise((r) => setTimeout(r, 120)))
    input.blur()
    fireEvent.click(screen.getByText('Réinitialiser'))
    expect(input.value).toBe('')
  })
})
