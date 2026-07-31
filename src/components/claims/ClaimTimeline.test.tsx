// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ClaimEventResponse } from '#/services/claims'
import { ClaimTimeline } from './ClaimTimeline'

afterEach(cleanup)

describe('ClaimTimeline', () => {
  it('renders events in chronological order without mutating the input', () => {
    const events: ClaimEventResponse[] = [
      {
        id: 2,
        type: 'NOTE',
        actorType: 'BACKOFFICE',
        comment: 'Second event',
        internal: false,
        createdAt: '2026-07-02T10:00:00Z',
      },
      {
        id: 1,
        type: 'CREATED',
        actorType: 'CLIENT',
        comment: 'First event',
        internal: false,
        createdAt: '2026-07-01T10:00:00Z',
      },
    ]

    render(<ClaimTimeline events={events} />)

    const items = screen.getAllByRole('listitem')
    expect(items[0]?.textContent).toContain('First event')
    expect(items[1]?.textContent).toContain('Second event')
    expect(events[0]?.id).toBe(2)
  })

  it('marks only internal events as hidden from the client', () => {
    const events: ClaimEventResponse[] = [
      {
        id: 1,
        type: 'NOTE',
        actorType: 'BACKOFFICE',
        comment: 'Private note',
        internal: true,
        createdAt: '2026-07-01T10:00:00Z',
      },
      {
        id: 2,
        type: 'ATTACHMENT_ADDED',
        actorType: 'CLIENT',
        comment: 'Public event',
        internal: false,
        createdAt: '2026-07-02T10:00:00Z',
      },
    ]

    render(<ClaimTimeline events={events} />)

    const marking = screen.getByText('Note interne · non visible du client')
    expect(marking.closest('li')?.textContent).toContain('Private note')
    expect(
      screen.getByText('Public event').closest('li')?.textContent,
    ).not.toContain('non visible du client')
  })
})
