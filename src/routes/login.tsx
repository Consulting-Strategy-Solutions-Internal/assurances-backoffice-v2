import { createFileRoute, Link, isRedirect, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { login, verifyAuth } from '#/services/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    try {
      await verifyAuth()
      throw redirect({ to: '/dashboard' })
    } catch (error) {
      if (isRedirect(error)) throw error
    }
  },
  component: LoginPage,
})

const loginSchema = z.object({
  email: z.string().min(1, 'L\'email est requis').email('L\'adresse email n\'est pas valide'),
  password: z.string().min(1, 'Le mot de passe est requis').min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await login(value)
        navigate({ to: '/dashboard' })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 401 || status === 403) {
            setServerError('Email ou mot de passe incorrect.')
          } else if (status && status >= 500) {
            setServerError('Une erreur serveur est survenue. Veuillez réessayer.')
          } else {
            setServerError('Une erreur est survenue. Veuillez réessayer.')
          }
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const result = loginSchema.shape.email.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="email">Email</label>
            <br />
            <input
              id="email"
              type="email"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
            />
            {field.state.meta.errors.length > 0 && (
              <p style={{ color: 'red', margin: '4px 0 0' }}>
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const result = loginSchema.shape.password.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <div>
            <label htmlFor="password">Mot de passe</label>
            <br />
            <input
              id="password"
              type="password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
            />
            {field.state.meta.errors.length > 0 && (
              <p style={{ color: 'red', margin: '4px 0 0' }}>
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>

      {serverError && (
        <p style={{ color: 'red', margin: '4px 0 0' }}>{serverError}</p>
      )}

      <button type="submit">Se connecter</button>

      <p>
        <Link to="/forgot-password">Mot de passe oublié ?</Link>
      </p>
    </form>
  )
}
