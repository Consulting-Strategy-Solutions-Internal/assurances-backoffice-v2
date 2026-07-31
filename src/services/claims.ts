import { api } from '#/lib/api'

export const CLAIM_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]
export type ClaimEventType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'ATTACHMENT_ADDED'
  | 'NOTE'
export type DeclaredBy = 'CLIENT' | 'BACKOFFICE'

export interface ClaimEventResponse {
  id: number
  type: ClaimEventType
  fromStatus?: ClaimStatus | null
  toStatus?: ClaimStatus | null
  actorType?: DeclaredBy | null
  comment?: string | null
  internal: boolean
  createdAt: string
}

export interface ClaimAttachmentResponse {
  id: number
  name: string
  contentType: string
  sizeBytes: number
  checksumSha256: string
  uploadedBy: DeclaredBy
  createdAt: string
}

export interface ClaimResponse {
  id: number
  claimNumber: string
  status: ClaimStatus
  subscriptionId: number
  clientId: number
  clientName?: string | null
  claimTypeId: number
  claimTypeName: string
  occurredOn: string
  location?: string | null
  description: string
  policyNumber?: string | null
  productLabel: string
  coverageStart?: string | null
  coverageEnd?: string | null
  declaredBy: DeclaredBy
  createdAt: string
  updatedAt: string
  events?: ClaimEventResponse[] | null
  attachments?: ClaimAttachmentResponse[] | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface ClaimFilters {
  status?: ClaimStatus
  clientId?: number
  claimTypeId?: number
  page: number
  size: number
  sort: string
}

export interface CreateClaimBackofficeDto {
  clientId: number
  subscriptionId: number
  claimTypeId: number
  occurredOn: string
  location?: string
  description: string
}

export interface ClaimActionDto {
  comment?: string
}

export type ClaimTransition = 'review' | 'request-info' | 'approve' | 'reject'

export const claimsKeys = {
  all: ['claims'] as const,
  list: (filters: ClaimFilters) => ['claims', filters] as const,
  detail: (id: number) => ['claim', id] as const,
}

export function buildClaimParams(filters: ClaimFilters) {
  return {
    status: filters.status,
    clientId: filters.clientId,
    claimTypeId: filters.claimTypeId,
    page: Math.max(0, filters.page),
    size: Math.min(100, Math.max(1, filters.size)),
    sort: filters.sort,
  }
}

export async function getClaims(
  filters: ClaimFilters,
): Promise<PageResponse<ClaimResponse>> {
  const response = await api.get<PageResponse<ClaimResponse>>('/claims', {
    params: buildClaimParams(filters),
  })
  return response.data
}

export async function getClaim(id: number): Promise<ClaimResponse> {
  const response = await api.get<ClaimResponse>(`/claims/${id}`)
  return response.data
}

export async function createClaim(
  payload: CreateClaimBackofficeDto,
): Promise<ClaimResponse> {
  const response = await api.post<ClaimResponse>('/claims', payload)
  return response.data
}

export async function transitionClaim(
  id: number,
  action: ClaimTransition,
  payload: ClaimActionDto,
): Promise<ClaimResponse> {
  const response = await api.post<ClaimResponse>(
    `/claims/${id}/${action}`,
    payload,
  )
  return response.data
}

export async function addClaimNote(
  id: number,
  comment: string,
): Promise<ClaimEventResponse> {
  const response = await api.post<ClaimEventResponse>(`/claims/${id}/notes`, {
    comment,
  })
  return response.data
}

export function buildAttachmentRequest(file: File, comment?: string) {
  const data = new FormData()
  data.append('file', file)
  return { data, params: comment?.trim() ? { comment: comment.trim() } : {} }
}

export async function uploadClaimAttachment(
  id: number,
  file: File,
  comment?: string,
): Promise<ClaimAttachmentResponse> {
  const request = buildAttachmentRequest(file, comment)
  const response = await api.post<ClaimAttachmentResponse>(
    `/claims/${id}/attachments`,
    request.data,
    { params: request.params, headers: { 'Content-Type': undefined } },
  )
  return response.data
}

export async function downloadClaimAttachment(
  claimId: number,
  attachmentId: number,
): Promise<Blob> {
  const response = await api.get<Blob>(
    `/claims/${claimId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  )
  return response.data
}
