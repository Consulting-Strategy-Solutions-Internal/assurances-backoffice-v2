import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { api } from '#/lib/api'

interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload) {
  const response = await api.post('/auth/admin/login', payload)
  return response.data
}

export async function logout() {
  await api.post('/auth/logout')
}

export const verifyAuth = createServerFn().handler(async () => {
  const cookie = getRequestHeader('cookie') ?? ''
  const response = await api.get('/auth/me', {
    headers: cookie ? { Cookie: cookie } : {},
  })
  return response.data
})
