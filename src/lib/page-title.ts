const SUFFIX = 'NSIA Back-office'

/** Full document title: « Clients · NSIA Back-office ». */
export function pageTitle(name: string): string {
  return `${name} · ${SUFFIX}`
}

/**
 * `head` option of a route file: `head: pageHead('Clients')` sets the tab title
 * to « Clients · NSIA Back-office ».
 */
export function pageHead(name: string) {
  return () => ({ meta: [{ title: pageTitle(name) }] })
}
