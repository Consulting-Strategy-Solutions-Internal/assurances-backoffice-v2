import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { api } from '#/lib/api'

export interface MeResponse {
  id: number
  userType: string
  firstName: string
  lastName: string
  email: string
  role: string
}

interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload) {
  const response = await api.post('/auth/admin/login', payload)
  return response.data
}

export async function forgotPassword(email: string) {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post('/auth/reset-password', { token, newPassword })
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function getMe(): Promise<MeResponse> {
  const response = await api.get('/auth/me')
  return response.data
}

export const verifyAuth = createServerFn().handler(async () => {
  const cookie = getRequestHeader('cookie') ?? ''
  const response = await api.get('/auth/me', {
    headers: cookie ? { Cookie: cookie } : {},
  })
  return response.data
})
