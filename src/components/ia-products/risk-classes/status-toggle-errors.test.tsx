// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OccupationsSection } from './OccupationsSection'
import { RiskClassDrawer } from './RiskClassDrawer'

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({
  getRiskClass: vi.fn(),
  getRiskClasses: vi.fn(),
  setRiskClassStatus: vi.fn(),
  setOccupationStatus: vi.fn(),
  addOccupation: vi.fn(),
  deleteOccupation: vi.fn(),
  deleteRiskClass: vi.fn(),
  updateOccupation: vi.fn(),
  updateRiskClass: vi.fn(),
}))
vi.mock('#/services/ia-standard', () => api)
vi.mock('#/components/dashboard/use-permissions', () => ({
  usePermissions: () => ({ can: () => true, canKnown: () => true }),
}))

const REASON =
  'Des contrats en cours utilisent cette classe : suppression impossible.'

function serverError() {
  const config = { headers: {} } as InternalAxiosRequestConfig
  return new AxiosError('fail', '409', config, null, {
    status: 409,
    statusText: '',
    headers: {},
    config,
    data: { errors: { subscriptions: 'RISK_CLASS_HAS_ACTIVE_CONTRACT' } },
  })
}

const occupation = {
  id: 5,
  riskClassId: 1,
  description: 'Comptable',
  active: true,
}
const detail = {
  id: 1,
  classNumber: 1,
  description: 'Bureau',
  active: true,
  occupationCount: 1,
  createdAt: '',
  updatedAt: '',
  occupations: [occupation],
}

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  toast.error.mockReset()
  api.getRiskClasses.mockResolvedValue({
    content: [],
    page: 0,
    size: 100,
    totalElements: 0,
    totalPages: 1,
    first: true,
    last: true,
  })
  api.getRiskClass.mockResolvedValue(detail)
})
afterEach(cleanup)

it('OccupationsSection : l’échec de bascule affiche le motif du serveur (R1-15)', async () => {
  api.setOccupationStatus.mockRejectedValue(serverError())
  wrap(<OccupationsSection riskClass={detail} canWrite />)
  await act(async () => screen.getByLabelText('Désactiver Comptable').click())
  await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(toast.error).toHaveBeenCalledWith(REASON)
})

it('RiskClassDrawer : l’échec de bascule affiche le motif du serveur (R1-15)', async () => {
  api.setRiskClassStatus.mockRejectedValue(serverError())
  wrap(<RiskClassDrawer classId={1} onClose={() => undefined} />)
  const toggle = await screen.findByLabelText('Classe active')
  await act(async () => toggle.click())
  await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(toast.error).toHaveBeenCalledWith(REASON)
})
