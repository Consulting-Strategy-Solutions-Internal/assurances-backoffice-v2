// @vitest-environment jsdom

import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { percentToCents } from '#/lib/commission-scheme-validation'
import { ShareSplitter } from './ShareSplitter'

beforeAll(() => {
  // Radix Slider measures itself; jsdom has neither observer nor matchMedia.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})
afterEach(cleanup)

function Harness({
  initial,
  errors = [],
  onValues,
  withConfirm = false,
  initiallyConfirmed = false,
}: {
  initial: string[]
  errors?: string[]
  onValues?: (values: string[]) => void
  withConfirm?: boolean
  initiallyConfirmed?: boolean
}) {
  const [values, setValues] = useState(initial)
  const [confirmed, setConfirmed] = useState(!withConfirm || initiallyConfirmed)
  const ids = ['a', 'b', 'c'].slice(0, initial.length)
  return (
    <>
      <ShareSplitter
        label="Répartition"
        confirmed={confirmed}
        onConfirmedChange={withConfirm ? setConfirmed : undefined}
        parts={ids.map((id, i) => ({
          id,
          label: `Part ${id}`,
          value: values[i],
          error: errors[i],
          onChange: (v: string) =>
            setValues((cur) => {
              const next = cur.map((c, j) => (j === i ? v : c))
              onValues?.(next)
              return next
            }),
        }))}
      />
      <output data-testid="values">{values.join('|')}</output>
      <output data-testid="confirmed">{String(confirmed)}</output>
    </>
  )
}

const values = () => screen.getByTestId('values').textContent
const total = () =>
  values()
    .split('|')
    .reduce((s, v) => s + (percentToCents(v) ?? 0), 0)
const thumb = (i = 0) => screen.getAllByRole('slider')[i]

describe('ShareSplitter — comportement (R1-37)', () => {
  it('pré-remplit 50/50 à 100 % au montage d’un bloc vide', () => {
    render(<Harness initial={['', '']} />)
    expect(values()).toBe('50|50')
  })

  it('pré-remplit 40/30/30 pour trois parts', () => {
    render(<Harness initial={['', '', '']} />)
    expect(values()).toBe('40|30|30')
  })

  it('garde les valeurs existantes cohérentes, sans les toucher', () => {
    render(<Harness initial={['33,33', '66,67']} />)
    expect(values()).toBe('33,33|66,67')
  })

  it('remplace un bloc incohérent (≠ 100 %) par le défaut', () => {
    render(<Harness initial={['10', '20']} />)
    expect(values()).toBe('50|50')
  })

  it('une flèche déplace le curseur de 0,5 % en gardant 100 %', () => {
    render(<Harness initial={['60', '40']} />)
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' })
    expect(values()).toBe('60,5|39,5')
    expect(total()).toBe(10_000)
  })

  it('garde 100 % avec deux curseurs qui se croisent', () => {
    render(<Harness initial={['40', '30', '30']} />)
    for (let i = 0; i < 4; i++)
      fireEvent.keyDown(thumb(0), { key: 'ArrowRight', shiftKey: false })
    expect(total()).toBe(10_000)
    expect(
      values()
        .split('|')
        .every((v) => (percentToCents(v) ?? -1) >= 0),
    ).toBe(true)
  })

  it('affiche l’erreur serveur sous la part concernée', () => {
    render(
      <Harness
        initial={['60', '40']}
        errors={[undefined as never, 'Refusé']}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Refusé')
    expect(alert.parentElement?.textContent).toContain('Part b')
  })
})

describe('ShareSplitter — précision au centième (R1-38)', () => {
  it('Maj+flèche déplace de 0,01 %', () => {
    render(<Harness initial={['60', '40']} />)
    fireEvent.keyDown(thumb(), { key: 'ArrowRight', shiftKey: true })
    expect(values()).toBe('60,01|39,99')
    fireEvent.keyDown(thumb(), { key: 'ArrowLeft', shiftKey: true })
    fireEvent.keyDown(thumb(), { key: 'ArrowLeft', shiftKey: true })
    expect(values()).toBe('59,99|40,01')
    expect(total()).toBe(10_000)
  })

  it('ne touche pas à une valeur précise tant qu’on ne déplace pas le curseur', () => {
    const onValues = vi.fn()
    render(<Harness initial={['33,33', '66,67']} onValues={onValues} />)
    fireEvent.focus(thumb())
    fireEvent.keyDown(thumb(), { key: 'Tab' })
    expect(onValues).not.toHaveBeenCalled()
    expect(values()).toBe('33,33|66,67')
  })

  it('reste dans [0 ; 100 %] avec Maj+flèche', () => {
    render(<Harness initial={['0', '100']} />)
    fireEvent.keyDown(thumb(), { key: 'ArrowLeft', shiftKey: true })
    expect(values()).toBe('0|100')
  })
})

describe('ShareSplitter — répartition par défaut à confirmer (R1-13)', () => {
  it('propose « Confirmer cette répartition » sur un bloc pré-rempli', () => {
    render(<Harness initial={['', '']} withConfirm />)
    expect(screen.getByTestId('confirmed').textContent).toBe('false')
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmer cette répartition' }),
    )
    expect(screen.getByTestId('confirmed').textContent).toBe('true')
    expect(screen.queryByRole('button', { name: /Confirmer/ })).toBeNull()
  })

  it('déplacer un curseur confirme la répartition', () => {
    render(<Harness initial={['', '']} withConfirm />)
    fireEvent.keyDown(thumb(), { key: 'ArrowRight' })
    expect(screen.getByTestId('confirmed').textContent).toBe('true')
  })

  it('un bloc chargé à 100 % est déjà confirmé (pas de bouton)', () => {
    render(<Harness initial={['70', '30']} withConfirm initiallyConfirmed />)
    // Le splitter ne repasse à « non confirmé » qu'au pré-remplissage.
    expect(screen.queryByRole('button', { name: /Confirmer/ })).toBeNull()
    expect(screen.getByTestId('confirmed').textContent).toBe('true')
  })
})
