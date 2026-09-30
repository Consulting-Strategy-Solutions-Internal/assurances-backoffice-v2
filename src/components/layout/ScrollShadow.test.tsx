// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import {
  ScrollShadow,
  scrollActiveIntoView,
  scrollDeltaToReveal,
} from './ScrollShadow'

afterEach(cleanup)

describe('scrollDeltaToReveal', () => {
  const scroller = { left: 0, right: 300 }
  it('is 0 when the item is fully visible', () => {
    expect(scrollDeltaToReveal(scroller, { left: 20, right: 120 })).toBe(0)
  })
  it('scrolls right (with padding) when the item is cut on the right', () => {
    expect(scrollDeltaToReveal(scroller, { left: 250, right: 400 }, 10)).toBe(
      110,
    )
  })
  it('scrolls left when the item is cut on the left', () => {
    expect(scrollDeltaToReveal(scroller, { left: -80, right: 10 }, 10)).toBe(
      -90,
    )
  })
})

function rect(left: number, right: number) {
  return {
    left,
    right,
    top: 0,
    bottom: 0,
    width: right - left,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

describe('scrollActiveIntoView', () => {
  it('scrolls the scroller (not the page) to the active element', () => {
    const scroller = document.createElement('div')
    scroller.innerHTML =
      '<button data-state="inactive">a</button><button data-state="active">b</button>'
    const active = scroller.querySelector(
      '[data-state="active"]',
    ) as HTMLElement
    scroller.getBoundingClientRect = () => rect(0, 300)
    active.getBoundingClientRect = () => rect(280, 380)
    scroller.scrollLeft = 0
    scrollActiveIntoView(scroller)
    expect(scroller.scrollLeft).toBe(92)
  })

  it('also follows aria-current and does nothing without an active element', () => {
    const scroller = document.createElement('div')
    scroller.innerHTML = '<a aria-current="page">x</a>'
    scroller.getBoundingClientRect = () => rect(100, 400)
    const link = scroller.querySelector('a') as HTMLElement
    link.getBoundingClientRect = () => rect(20, 90)
    scroller.scrollLeft = 200
    scrollActiveIntoView(scroller)
    expect(scroller.scrollLeft).toBe(200 - 92)

    const empty = document.createElement('div')
    empty.scrollLeft = 5
    scrollActiveIntoView(empty)
    expect(empty.scrollLeft).toBe(5)
  })
})

describe('ScrollShadow', () => {
  it('reveals the active tab on mount and when the active tab changes', async () => {
    const proto = Element.prototype
    const original = proto.getBoundingClientRect
    proto.getBoundingClientRect = function (this: Element) {
      if (this.hasAttribute('data-scroll')) return rect(0, 300)
      if (this.getAttribute('data-state') === 'active')
        return this.textContent === 'one' ? rect(10, 90) : rect(400, 500)
      return rect(0, 0)
    }
    try {
      const { container } = render(
        <ScrollShadow>
          <button data-state="active">one</button>
          <button data-state="inactive">two</button>
        </ScrollShadow>,
      )
      const scroller = container.querySelector('[data-scroll]') as HTMLElement
      expect(scroller.scrollLeft).toBe(0)
      const [one, two] = Array.from(scroller.querySelectorAll('button'))
      one.setAttribute('data-state', 'inactive')
      two.setAttribute('data-state', 'active')
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(scroller.scrollLeft).toBe(212)
    } finally {
      proto.getBoundingClientRect = original
    }
  })

  it('ignores data-state changes of unrelated descendants', async () => {
    const proto = Element.prototype
    const original = proto.getBoundingClientRect
    let calls = 0
    proto.getBoundingClientRect = function (this: Element) {
      if (this.getAttribute('data-state') === 'active') calls++
      return rect(0, 0)
    }
    try {
      const { container } = render(
        <ScrollShadow>
          <button data-state="active">one</button>
          <span data-testid="tip" data-state="closed">
            tip
          </span>
        </ScrollShadow>,
      )
      const before = calls
      container
        .querySelector('[data-testid="tip"]')
        ?.setAttribute('data-state', 'open')
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(calls).toBe(before)
    } finally {
      proto.getBoundingClientRect = original
    }
  })
})
