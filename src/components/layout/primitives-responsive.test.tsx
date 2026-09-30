// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { Stepper } from '#/components/ui/Stepper'
import { Sheet, SheetContent, SheetTitle } from '#/components/ui/sheet'
import { DateRangeFilter } from './DateRangeFilter'
import { DetailSkeleton } from './DetailSkeleton'
import { InfoList, InfoRow } from './InfoList'
import { KPI_ROW_CLASS, KpiRow } from './KpiRow'
import { ResultCount, TOOLBAR_CLASS, Toolbar, ToolbarSearch } from './Toolbar'

afterEach(cleanup)

describe('KpiRow', () => {
  it('uses 2 columns on phones and 4 on wide content for cols=4', () => {
    const { container } = render(<KpiRow>x</KpiRow>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('grid-cols-2')
    expect(cls).toContain('@4xl/main:grid-cols-4')
    expect(cls).not.toContain('xl:grid-cols-4 ')
  })

  it('uses 2 columns with a full-width 3rd card on phones for cols=3', () => {
    expect(KPI_ROW_CLASS[3]).toContain('grid-cols-2')
    expect(KPI_ROW_CLASS[3]).toContain('@xl/main:grid-cols-3')
    expect(KPI_ROW_CLASS[3]).toContain(
      '[&>:nth-child(3):last-child]:col-span-2',
    )
    const { container } = render(
      <KpiRow cols={3} className="mb-0">
        x
      </KpiRow>,
    )
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('mb-0')
    expect(cls).not.toContain('mb-[18px]')
  })
})

describe('KpiCard', () => {
  it('renders the unit next to the value and adapts the value size', () => {
    render(
      <KpiCard
        icon={<span />}
        iconClass="bg-primary"
        value="75 805"
        unit="FCFA"
        label="Prime TTC cumulée"
      />,
    )
    expect(screen.getByText('FCFA')).toBeTruthy()
    const value = screen.getByText('75 805').parentElement as HTMLElement
    expect(value.className).toContain('text-[clamp(16px,18cqi,24px)]')
    expect(value.parentElement?.className).toContain('@container/kpi')
    expect(value.className).toContain('@xl/main:text-[30px]')
    expect(document.querySelector('[data-slot="card"]')?.className).toContain(
      'min-w-0',
    )
  })

  it('keeps the trend badge', () => {
    render(
      <KpiCard
        icon={<span />}
        iconClass=""
        value="3"
        label="Clients"
        trend={{ label: '+4 %', class: 'bg-green-100' }}
      />,
    )
    expect(screen.getByText('+4 %')).toBeTruthy()
  })
})

describe('Toolbar', () => {
  it('is a 2-column grid on phones and an inline row above', () => {
    expect(TOOLBAR_CLASS).toContain('grid grid-cols-2')
    expect(TOOLBAR_CLASS).toContain('@xl/main:flex')
    expect(TOOLBAR_CLASS).toContain('@max-xl/main:[&>*]:w-full!')
  })

  it('lets the search span both columns and shrink on phones', () => {
    render(
      <Toolbar
        search={
          <ToolbarSearch
            label="Rechercher"
            placeholder="Nom…"
            value=""
            onChange={() => {}}
          />
        }
      />,
    )
    const field = screen.getByLabelText('Rechercher')
      .parentElement as HTMLElement
    expect(field.className).toContain('col-span-2')
    expect(field.className).toContain('min-w-0')
    expect(field.className).toContain('@xl/main:min-w-[240px]')
  })

  it('wraps the result count and its note', () => {
    render(<ResultCount note="Données partielles">12 clients</ResultCount>)
    const row = screen.getByText('12 clients').parentElement as HTMLElement
    expect(row.className).toContain('flex-wrap')
    expect(screen.getByText('Données partielles').className).toContain(
      'basis-full',
    )
  })
})

describe('DateRangeFilter', () => {
  it('renders two labelled fields with a shared id prefix', () => {
    render(
      <DateRangeFilter
        idPrefix="cot"
        from="2026-09-01"
        onFromChange={() => {}}
        onToChange={() => {}}
      />,
    )
    const from = screen.getByLabelText<HTMLInputElement>('Du')
    expect(from.id).toBe('cot-from')
    expect(from.value).toBe('01/09/2026')
    expect(screen.getByLabelText('au').id).toBe('cot-to')
    expect(from.className).toContain('w-full')
  })
})

describe('InfoList', () => {
  it('goes to 2 columns only when its own width allows it', () => {
    const { container } = render(
      <InfoList columns={2}>
        <InfoRow label="Email">a@b.c</InfoRow>
      </InfoList>,
    )
    expect(container.firstElementChild?.className).toContain('@container')
    const dl = container.querySelector('dl') as HTMLElement
    expect(dl.className).toContain('@sm:grid-cols-2')
    expect(dl.className).not.toMatch(/(^| )grid-cols-2/)
  })

  it('stays on one column by default', () => {
    const { container } = render(
      <InfoList>
        <InfoRow label="Email">a@b.c</InfoRow>
      </InfoList>,
    )
    expect(container.querySelector('dl')?.className).not.toContain(
      'grid-cols-2',
    )
  })
})

describe('DetailSkeleton', () => {
  it('builds the KPI placeholders with KpiRow', () => {
    const { container } = render(<DetailSkeleton kpis={3} />)
    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid.className).toContain(KPI_ROW_CLASS[3])
    expect(grid.children).toHaveLength(3)
  })

  it('omits the KPI row with kpis=0', () => {
    const { container } = render(<DetailSkeleton kpis={0} />)
    expect(container.querySelector('.grid')).toBeNull()
  })
})

describe('Stepper', () => {
  it('shows a compact « Étape n sur N » line below sm and the full list above', () => {
    const { container } = render(
      <Stepper steps={['Manager', 'Agences', 'Agents']} current={1} />,
    )
    expect(screen.getByText('Étape 2 sur 3 · Agences')).toBeTruthy()
    expect(
      container.querySelector('[aria-label="Étape 2 sur 3"]')?.className,
    ).toContain('sm:hidden')
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByText('Manager').closest('.hidden')?.className).toContain(
      'sm:flex',
    )
  })

  it('marks the current step aria-current=step in both modes', () => {
    const { container } = render(
      <Stepper steps={['Manager', 'Agences', 'Agents']} current={1} />,
    )
    const current = Array.from(
      container.querySelectorAll('[aria-current="step"]'),
    )
    expect(current).toHaveLength(2)
    expect(current.map((el) => el.textContent)).toEqual([
      'Étape 2 sur 3 · Agences',
      '2Agences',
    ])
  })

  it('keeps steps reachable below sm: compact bars are 36px buttons when clickable', () => {
    const onStepClick = vi.fn()
    render(
      <Stepper
        steps={['Manager', 'Agences', 'Agents']}
        current={0}
        onStepClick={onStepClick}
      />,
    )
    const bar = screen.getByRole('button', { name: 'Étape 3 : Agents' })
    expect(bar.className).toContain('h-9')
    fireEvent.click(bar)
    expect(onStepClick).toHaveBeenCalledWith(2)
  })
})

describe('SheetContent size', () => {
  function open(size?: 'sm' | 'md' | 'lg') {
    render(
      <Sheet open>
        <SheetContent size={size} aria-describedby={undefined}>
          <SheetTitle>t</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    return document.querySelector('[data-slot="sheet-content"]') as HTMLElement
  }

  it.each([
    ['sm', 'sm:w-[430px]'],
    ['md', 'sm:w-[480px]'],
    ['lg', 'sm:w-[520px]'],
  ] as const)('size %s is full width on phones then %s', (size, wide) => {
    const cls = open(size).className
    expect(cls).toContain('w-full')
    expect(cls).toContain(wide)
    expect(cls).not.toContain('w-3/4')
  })

  it('keeps the historic width without size and declares the container', () => {
    const cls = open().className
    expect(cls).toContain('w-3/4')
    expect(cls).toContain('@container/main')
  })
})
