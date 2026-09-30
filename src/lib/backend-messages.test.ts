import { describe, expect, it } from 'vitest'
import {
  isKnownBackendMessage,
  translateBackendMessage,
  translateRoleDescription,
} from './backend-messages'

describe('translateBackendMessage', () => {
  it('translates a known holdReason', () => {
    expect(
      translateBackendMessage(
        'No commission scheme for this partner and product',
      ),
    ).toBe('Aucun schéma de commission pour ce partenaire et ce produit.')
  })
  it('ignores case and a trailing full stop', () => {
    expect(
      translateBackendMessage(
        'Level 2 sale is not covered by the commission scheme.',
      ),
    ).toContain('niveau 2')
  })
  it('captures values in patterns', () => {
    expect(
      translateBackendMessage('product not found for productCode: 42'),
    ).toBe('Produit introuvable pour le code produit 42.')
    expect(translateBackendMessage('Partner not found with id: 7')).toBe(
      'Partenaire introuvable (n° 7).',
    )
    expect(translateBackendMessage("maxPremium must be a number: 'abc'")).toBe(
      'maxPremium doit être un nombre (reçu « abc »).',
    )
  })
  it('returns unknown or already-French messages unchanged', () => {
    expect(translateBackendMessage('Quelque chose a échoué')).toBe(
      'Quelque chose a échoué',
    )
    expect(translateBackendMessage('Weird new thing')).toBe('Weird new thing')
  })
  it('flags known messages', () => {
    expect(isKnownBackendMessage('Access Denied')).toBe(true)
    expect(isKnownBackendMessage('Weird new thing')).toBe(false)
  })
})

describe('translateRoleDescription', () => {
  it('translates the system roles', () => {
    expect(translateRoleDescription('Full access to all resources')).toBe(
      'Accès complet à toutes les ressources.',
    )
    expect(
      translateRoleDescription('Front-end developer - API documentation only'),
    ).toContain('documentation')
  })
  it('handles empty and unknown descriptions', () => {
    expect(translateRoleDescription(null)).toBe('')
    expect(translateRoleDescription('Custom role')).toBe('Custom role')
  })
})
