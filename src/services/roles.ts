import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface PermissionResponse {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface RoleResponse {
  id: number
  name: string
  description?: string
  permissions: PermissionResponse[]
  createdAt: string
  updatedAt: string
}

export async function getRoles(
  page = 0,
  size = 20,
): Promise<PageResponse<RoleResponse>> {
  const response = await api.get('/roles', { params: { page, size } })
  return response.data
}

export async function getPermissions(
  page = 0,
  size = 20,
): Promise<PageResponse<PermissionResponse>> {
  const response = await api.get('/permissions', { params: { page, size } })
  return response.data
}

export async function createRole(data: {
  name: string
  description?: string
}): Promise<RoleResponse> {
  const response = await api.post('/roles', data)
  return response.data
}

export async function addPermissionToRole(
  roleId: number,
  permissionId: number,
): Promise<RoleResponse> {
  const response = await api.post(
    `/roles/${roleId}/permissions/${permissionId}`,
  )
  return response.data
}
