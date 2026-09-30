import { describe, expect, it } from 'vitest'
import { formatPersonName, personInitials } from './people'

describe('formatPersonName', () => {
  it('trims and collapses whitespace', () => {
    expect(formatPersonName('  Awa   ', ' Koné ')).toBe('Awa Koné')
  })
  it('title-cases all-caps names consistently', () => {
    expect(formatPersonName('NIAMIEN ', 'ABOU')).toBe('Niamien Abou')
    expect(formatPersonName('Niamien', 'ABOU')).toBe('Niamien Abou')
  })
  it('handles hyphens and apostrophes', () => {
    expect(formatPersonName('JEAN-PAUL', "N'GUESSAN")).toBe(
      "Jean-Paul N'Guessan",
    )
  })
  it('keeps particles lower case after the first word', () => {
    expect(formatPersonName('MARIE', 'DE LA CROIX')).toBe('Marie de La Croix')
    expect(formatPersonName('Jan', 'VAN DER BERG')).toBe('Jan van der Berg')
  })
  it('leaves mixed-case words and initials alone', () => {
    expect(formatPersonName('K.', 'McDonald')).toBe('K. McDonald')
  })
  it('ignores empty parts', () => {
    expect(formatPersonName(null, undefined, '  ')).toBe('')
    expect(formatPersonName('Awa', null)).toBe('Awa')
  })
})

describe('personInitials', () => {
  it('uses first and last word', () => {
    expect(personInitials('NIAMIEN  Abou')).toBe('NA')
    expect(personInitials('Awa')).toBe('A')
    expect(personInitials('')).toBe('')
  })
})
