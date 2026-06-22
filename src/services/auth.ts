import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { api } from '#/lib/api'

interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload) {
  const response = await api.post('/auth/admin/login', payload)
  return response.data
}

export const verifyAuth = createServerFn().handler(async () => {
  const request = getWebRequest()
  const cookie = request?.headers.get('cookie') ?? ''
  const response = await api.get('/auth/me', {
    headers: cookie ? { cookie } : undefined,
  })
  return response.data
})
