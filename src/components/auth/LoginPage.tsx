import { Link, useNavigate } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { login } from '#/services/auth'
import { Button } from '#/components/ui/button'
import { FormField } from '#/components/forms/FormField'
import {
  AuthCard,
  AuthHeading,
  AUTH_LINK_CLASS,
  AuthShell,
} from '#/components/auth/AuthShell'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'adresse email n'est pas valide"),
  // Pas de longueur minimale à la connexion : les règles de mot de passe ne
  // s'appliquent qu'à la création, un ancien compte doit pouvoir se connecter.
  password: z.string().min(1, 'Le mot de passe est requis'),
})

type LoginField = keyof typeof loginSchema.shape

function validateField(field: LoginField, value: string) {
  const result = loginSchema.shape[field].safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

function fieldValidators(field: LoginField) {
  return {
    onDynamic: ({ value }: { value: string }) => validateField(field, value),
  }
}

export function LoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  // Avant l'hydratation, un envoi natif du formulaire mettrait les identifiants dans l'URL.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validationLogic: revalidateLogic({
      mode: 'blur',
      modeAfterSubmission: 'change',
    }),
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await login(value)
        navigate({ to: '/dashboard' })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (!error.response) {
            setServerError('Impossible de contacter le serveur.')
          } else if (status === 401 || status === 403) {
            setServerError('Email ou mot de passe incorrect.')
          } else if (status && status >= 500) {
            setServerError(
              'Une erreur serveur est survenue. Veuillez réessayer.',
            )
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
    <AuthShell>
      <AuthCard>
        <AuthHeading
          title="Connexion"
          description="Accédez à votre back-office NSIA Assurances."
        />

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.Field name="email" validators={fieldValidators('email')}>
            {(field) => (
              <FormField
                id="email"
                label="Email"
                type="email"
                autoComplete="username"
                required
                value={field.state.value}
                onChange={(value) => {
                  setServerError(null)
                  field.handleChange(value)
                }}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0]}
              />
            )}
          </form.Field>

          <form.Field name="password" validators={fieldValidators('password')}>
            {(field) => (
              <FormField
                id="password"
                label="Mot de passe"
                type="password"
                autoComplete="current-password"
                revealable
                required
                value={field.state.value}
                onChange={(value) => {
                  setServerError(null)
                  field.handleChange(value)
                }}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0]}
              />
            )}
          </form.Field>

          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
              {serverError}
            </p>
          )}

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                disabled={isSubmitting || !hydrated}
                className="mt-1 h-11 rounded-[11px] text-[14px] shadow-[0_4px_14px_rgba(0,51,127,0.25)]"
              >
                {isSubmitting ? 'Connexion…' : 'Se connecter'}
              </Button>
            )}
          </form.Subscribe>
        </form>

        <div className="mt-5 text-center">
          <Link to="/forgot-password" className={AUTH_LINK_CLASS}>
            Mot de passe oublié ?
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
