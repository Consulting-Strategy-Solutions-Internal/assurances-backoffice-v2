// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Table, TableBody, TableHeader, TableRow } from '#/components/ui/table'
import {
  ClickableRow,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  RowChevron,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
  hideBelowClass,
  stickyCellClass,
} from './DataTable'
import { MobileCardContent, MobileCardList } from './MobileCardList'

afterEach(cleanup)

describe('hideBelowClass', () => {
  it('maps each priority to a container-query class on the main column', () => {
    expect(hideBelowClass('sm')).toBe('hidden @xl/main:table-cell')
    expect(hideBelowClass('md')).toBe('hidden @2xl/main:table-cell')
    expect(hideBelowClass('lg')).toBe('hidden @4xl/main:table-cell')
    expect(hideBelowClass('xl')).toBe('hidden @5xl/main:table-cell')
  })

  it('adds nothing when the column is always visible', () => {
    expect(hideBelowClass(undefined)).toBeUndefined()
  })
})

describe('DataTableHead / DataTableCell', () => {
  function renderTable() {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <DataTableHead first sticky="left">
              Nom
            </DataTableHead>
            <DataTableHead hideBelow="md">Créé le</DataTableHead>
            <DataTableHead sticky="right">Actions</DataTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <DataTableCell first sticky="left">
              Awa
            </DataTableCell>
            <DataTableCell hideBelow="md">01/02/2026</DataTableCell>
            <DataTableCell sticky="right">Ouvrir</DataTableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
  }

  it('applies the same hideBelow class on head and body cells', () => {
    renderTable()
    for (const text of ['Créé le', '01/02/2026']) {
      const cell = screen.getByText(text)
      expect(cell.className).toContain('hidden')
      expect(cell.className).toContain('@2xl/main:table-cell')
    }
    expect(screen.getByText('Nom').className).not.toContain('hidden')
  })

  it('pins the first and the action columns, marked for the hover rule', () => {
    renderTable()
    const first = screen.getByText('Awa')
    expect(first.className).toContain('sticky left-0')
    expect(first.className).toContain('pl-[22px]')
    expect(first.hasAttribute('data-sticky')).toBe(true)
    expect(screen.getByText('Ouvrir').className).toContain('sticky right-0')
    expect(screen.getByText('Actions').className).toContain('sticky right-0')
    expect(screen.getByText('Créé le').hasAttribute('data-sticky')).toBe(false)
  })

  it('marks a selected ClickableRow so its sticky cells follow the tint', () => {
    render(
      <Table>
        <TableBody>
          <ClickableRow selected onActivate={() => {}}>
            <DataTableCell sticky="left">Sélectionnée</DataTableCell>
            <RowChevron />
          </ClickableRow>
          <ClickableRow onActivate={() => {}}>
            <DataTableCell sticky="left">Autre</DataTableCell>
          </ClickableRow>
        </TableBody>
      </Table>,
    )
    const selected = screen.getByText('Sélectionnée').closest('tr')
    expect(selected?.hasAttribute('data-selected')).toBe(true)
    expect(selected?.className).toContain('data-[selected]:bg-primary/5')
    expect(
      screen.getByText('Autre').closest('tr')?.hasAttribute('data-selected'),
    ).toBe(false)
  })

  it('exposes the sticky class for raw cells', () => {
    expect(stickyCellClass('right')).toContain('sticky right-0')
    expect(stickyCellClass(undefined)).toBeUndefined()
  })
})

describe('table states', () => {
  it('centres empty and error states on the visible width', () => {
    render(
      <Table>
        <TableBody>
          <TableEmptyState colSpan={4} title="Aucun client." />
          <TableErrorState colSpan={4} forbidden />
        </TableBody>
      </Table>,
    )
    const wrapper = screen.getByText('Aucun client.').closest('.sticky')
    expect(wrapper?.className).toContain('w-[var(--table-viewport,100%)]')
    expect(screen.getByText('Accès refusé.')).toBeTruthy()
  })

  it('hides skeleton cells of secondary columns', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableSkeletonRows
            rows={1}
            columns={[10, 10]}
            hideBelow={[undefined, 'lg']}
          />
        </TableBody>
      </Table>,
    )
    const cells = container.querySelectorAll('td')
    expect(cells[0].className).not.toContain('hidden')
    expect(cells[1].className).toContain('@4xl/main:table-cell')
  })
})

describe('DataTableCard mobileCards', () => {
  it('shows the cards below md and hides the table card', () => {
    const { container } = render(
      <DataTableCard mobileCards={<p>cartes</p>}>
        <p>tableau</p>
      </DataTableCard>,
    )
    expect(screen.getByText('cartes').parentElement?.className).toContain(
      '@2xl/main:hidden',
    )
    const card = container.querySelector('[data-slot="card"]')
    expect(card?.className).toContain('hidden')
    expect(card?.className).toContain('@2xl/main:flex')
  })

  it('stays a plain card without mobileCards', () => {
    const { container } = render(
      <DataTableCard>
        <p>tableau</p>
      </DataTableCard>,
    )
    expect(
      container.querySelector('[data-slot="card"]')?.className,
    ).not.toContain('@2xl/main:flex')
  })
})

describe('MobileCardList', () => {
  const empty = { title: 'Aucun client pour le moment.' }
  const base = {
    getKey: (n: number) => n,
    renderCard: (n: number) => <MobileCardContent title={`Client ${n}`} />,
    empty,
  }

  it('renders one tappable card per item and activates on click and Enter', () => {
    const onActivate = vi.fn()
    render(<MobileCardList {...base} items={[1, 2]} onActivate={onActivate} />)
    const cards = screen.getAllByRole('button')
    expect(cards).toHaveLength(2)
    fireEvent.click(cards[0])
    fireEvent.keyDown(cards[1], { key: 'Enter' })
    expect(onActivate).toHaveBeenNthCalledWith(1, 1)
    expect(onActivate).toHaveBeenNthCalledWith(2, 2)
  })

  it('renders plain cards without onActivate', () => {
    render(<MobileCardList {...base} items={[1]} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Client 1')).toBeTruthy()
  })

  it('shows skeletons while loading', () => {
    const { container } = render(
      <MobileCardList {...base} items={[]} isLoading skeletonCount={3} />,
    )
    expect(container.querySelectorAll('li')).toHaveLength(3)
    expect(screen.queryByText(empty.title)).toBeNull()
  })

  it('shows the empty state', () => {
    render(<MobileCardList {...base} items={[]} />)
    expect(screen.getByText(empty.title)).toBeTruthy()
  })

  it('shows the error and the 403 states', () => {
    const { rerender } = render(
      <MobileCardList
        {...base}
        items={[]}
        error
        errorTitle="Impossible de charger."
      />,
    )
    expect(screen.getByText('Impossible de charger.')).toBeTruthy()
    rerender(<MobileCardList {...base} items={[]} error forbidden />)
    expect(screen.getByText('Accès refusé.')).toBeTruthy()
  })
})

describe('RowChevron', () => {
  it('reste collé à droite pendant le défilement horizontal', () => {
    render(
      <table>
        <tbody>
          <tr>
            <RowChevron />
          </tr>
        </tbody>
      </table>,
    )
    const cell = document.querySelector('td')!
    expect(cell.className).toContain('sticky')
    expect(cell.className).toContain('right-0')
    expect(cell.hasAttribute('data-sticky')).toBe(true)
  })
})

describe('sticky « from sm » (L-007)', () => {
  it('ne colle la cellule qu’à partir de 576 px de contenu', () => {
    render(
      <table>
        <thead>
          <tr>
            <DataTableHead sticky="left" stickyFrom="sm">
              Nom
            </DataTableHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <DataTableCell sticky="left" stickyFrom="sm">
              A
            </DataTableCell>
          </tr>
        </tbody>
      </table>,
    )
    for (const el of [
      screen.getByText('Nom'),
      screen.getByText('A'),
    ] as HTMLElement[]) {
      const classes = el.className.split(/\s+/)
      expect(classes).toContain('@xl/main:sticky')
      expect(classes).not.toContain('sticky')
      expect(el.hasAttribute('data-sticky')).toBe(true)
    }
  })
})
