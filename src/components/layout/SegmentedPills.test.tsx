// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SegmentedPills } from './SegmentedPills'

const options = [
  { value: 'a', label: 'En attente de paiement' },
  { value: 'b', label: 'Appliquées' },
]

afterEach(cleanup)

describe('SegmentedPills', () => {
  it('keeps the historic markup by default (no scroller, no data-state)', () => {
    render(
      <SegmentedPills
        label="Statut"
        value="a"
        options={options}
        onChange={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', {
      name: 'En attente de paiement',
    })
    expect(button.hasAttribute('data-state')).toBe(false)
    expect(document.querySelector('[data-scroll]')).toBeNull()
    expect(button.parentElement?.className).not.toContain('whitespace-nowrap')
  })

  it('scrollable: one-line pills in a scroll strip, active pill flagged', () => {
    const onChange = vi.fn()
    render(
      <SegmentedPills
        label="Statut"
        value="a"
        options={options}
        onChange={onChange}
        scrollable
      />,
    )
    const scroller = document.querySelector('[data-scroll]')
    expect(scroller).not.toBeNull()
    const active = screen.getByRole('button', {
      name: 'En attente de paiement',
    })
    expect(active.dataset.state).toBe('active')
    expect(scroller?.contains(active)).toBe(true)
    expect(active.parentElement?.className).toContain('whitespace-nowrap')
    fireEvent.click(screen.getByRole('button', { name: 'Appliquées' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
