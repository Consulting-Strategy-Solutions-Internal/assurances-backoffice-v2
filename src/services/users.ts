import { api } from '#/lib/api'

export interface UserResponse {
  id: number
  role: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  addressLine1: string
  addressLine2?: string
  emailVerified: boolean
  partnerId?: number
  agencyIds: number[]
  createdAt: string
  updatedAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface UsersParams {
  page?: number
  size?: number
}

export async function getUsers(
  params: UsersParams = {},
): Promise<PageResponse<UserResponse>> {
  const response = await api.get('/users', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}

export interface CreateUserPayload {
  roleId: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  addressLine1: string
  addressLine2?: string
}

export async function createUser(
  data: CreateUserPayload,
): Promise<UserResponse> {
  const response = await api.post('/users', data)
  return response.data
}

// Détails complets d'un utilisateur (téléphone, adresse…) — `/auth/me` ne
// renvoie qu'un profil allégé, on passe par `/users/{id}` pour le reste.
export async function getUser(id: number): Promise<UserResponse> {
  const response = await api.get(`/users/${id}`)
  return response.data
}

export interface UpdateUserPayload {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  addressLine1: string
  addressLine2?: string
}

export async function updateUser(
  id: number,
  data: UpdateUserPayload,
): Promise<UserResponse> {
  const response = await api.put(`/users/${id}`, data)
  return response.data
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// Change le mot de passe de l'utilisateur connecté (`PUT /users/me/password`).
export async function changeMyPassword(
  data: ChangePasswordPayload,
): Promise<void> {
  await api.put('/users/me/password', data)
}

// Rattache un utilisateur (manager) à un partenaire.
export async function assignUserToPartner(
  userId: number,
  partnerId: number,
): Promise<UserResponse> {
  const response = await api.put(`/users/${userId}/partner/${partnerId}`)
  return response.data
}

// Rattache / détache un utilisateur à une agence.
export async function assignUserToAgency(
  userId: number,
  agencyId: number,
): Promise<UserResponse> {
  const response = await api.post(`/users/${userId}/agencies/${agencyId}`)
  return response.data
}

export async function removeUserFromAgency(
  userId: number,
  agencyId: number,
): Promise<UserResponse> {
  const response = await api.delete(`/users/${userId}/agencies/${agencyId}`)
  return response.data
}
