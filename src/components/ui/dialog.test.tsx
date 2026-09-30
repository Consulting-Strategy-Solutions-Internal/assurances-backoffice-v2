// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { FormDialog } from '#/components/forms/FormDialog'

afterEach(cleanup)

function content(size?: 'default' | 'wide' | 'xl') {
  render(
    <Dialog open>
      <DialogContent size={size} aria-describedby={undefined}>
        <DialogTitle>t</DialogTitle>
      </DialogContent>
    </Dialog>,
  )
  return document.querySelector('[data-slot="dialog-content"]') as HTMLElement
}

describe('DialogContent', () => {
  it('never exceeds the dynamic viewport height and scrolls', () => {
    const cls = content().className
    expect(cls).toContain('max-h-[calc(100dvh-2rem)]')
    expect(cls).toContain('overflow-y-auto')
    expect(cls).toContain('sm:max-w-lg')
  })

  it.each([
    ['wide', 'sm:max-w-[min(760px,calc(100%-2rem))]'],
    ['xl', 'sm:max-w-[min(56rem,calc(100%-2rem))]'],
  ] as const)('size %s keeps the side margin', (size, cls) => {
    expect(content(size).className).toContain(cls)
  })
})

describe('FormDialog layout', () => {
  it('pins header and footer around a scrolling body, footer in 2 columns on phones', () => {
    render(
      <FormDialog
        onClose={() => {}}
        eyebrow="Clients"
        title="Ajouter"
        onSubmit={() => {}}
        submitLabel="Enregistrer"
      >
        <input aria-label="Nom" />
      </FormDialog>,
    )
    const body = document.querySelector('input')?.parentElement as HTMLElement
    expect(body.className).toContain('min-h-0')
    expect(body.className).toContain('flex-1')
    expect(body.className).toContain('overflow-y-auto')
    const footer = document.querySelector(
      '[data-slot="dialog-footer"]',
    ) as HTMLElement
    expect(footer.className).toContain('grid-cols-2')
    expect(footer.className).toContain('sm:flex')
  })
})
