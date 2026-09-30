// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FrDateInput } from './FrDateInput'

afterEach(cleanup)

describe('FrDateInput', () => {
  it('affiche la valeur ISO en jj/mm/aaaa', () => {
    render(
      <FrDateInput aria-label="Du" value="2026-09-03" onChange={vi.fn()} />,
    )
    expect(screen.getByLabelText<HTMLInputElement>('Du').value).toBe(
      '03/09/2026',
    )
  })

  it('masque la saisie et ne propage une date que complète et réelle', () => {
    const onChange = vi.fn()
    render(<FrDateInput aria-label="Du" onChange={onChange} />)
    const input = screen.getByLabelText<HTMLInputElement>('Du')
    fireEvent.change(input, { target: { value: '0309' } })
    expect(input.value).toBe('03/09')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '03092026' } })
    expect(input.value).toBe('03/09/2026')
    expect(onChange).toHaveBeenLastCalledWith('2026-09-03')
    fireEvent.change(input, { target: { value: '31022026' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('retire le filtre appliqué quand la saisie devient incomplète ou invalide', () => {
    const onChange = vi.fn()
    render(
      <FrDateInput aria-label="Du" value="2026-09-03" onChange={onChange} />,
    )
    const input = screen.getByLabelText<HTMLInputElement>('Du')
    fireEvent.change(input, { target: { value: '03/09/202' } })
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    onChange.mockClear()
    fireEvent.change(input, { target: { value: '31/02/2026' } })
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('affiche un message pour une date complète invalide, pas avant', () => {
    render(<FrDateInput aria-label="Du" onChange={vi.fn()} />)
    const input = screen.getByLabelText<HTMLInputElement>('Du')
    fireEvent.change(input, { target: { value: '31/02' } })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.change(input, { target: { value: '31022026' } })
    expect(screen.getByRole('alert').textContent).toMatch(/date invalide/i)
    expect(input.getAttribute('aria-describedby')).toBe(
      screen.getByRole('alert').id,
    )
    fireEvent.change(input, { target: { value: '03092026' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('propage undefined quand le champ est vidé et se resynchronise à la réinitialisation', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <FrDateInput aria-label="Du" value="2026-09-03" onChange={onChange} />,
    )
    const input = screen.getByLabelText<HTMLInputElement>('Du')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    rerender(
      <FrDateInput aria-label="Du" value="2026-01-15" onChange={onChange} />,
    )
    expect(input.value).toBe('15/01/2026')
    rerender(
      <FrDateInput aria-label="Du" value={undefined} onChange={onChange} />,
    )
    expect(input.value).toBe('')
  })
})
