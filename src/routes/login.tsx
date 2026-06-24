import {
  createFileRoute,
  Link,
  isRedirect,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { login, verifyAuth } from '#/services/auth'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { FormField } from '#/components/forms/FormField'

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

const LOGIN_BG = '/login-bg.jpg'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'adresse email n'est pas valide"),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

type LoginField = keyof typeof loginSchema.shape

/** Validate a single field against its Zod rule, returning the first error message. */
function validateField(field: LoginField, value: string) {
  const result = loginSchema.shape[field].safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

/**
 * onBlur shows the error when leaving the field; onChange re-validates only once
 * the field has been blurred, so a corrected value clears the error live —
 * without forcing the user to click back into the input.
 */
function fieldValidators(field: LoginField) {
  return {
    onBlur: ({ value }: { value: string }) => validateField(field, value),
    onChange: ({
      value,
      fieldApi,
    }: {
      value: string
      fieldApi: { state: { meta: { isBlurred: boolean } } }
    }) => (fieldApi.state.meta.isBlurred ? validateField(field, value) : undefined),
  }
}

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
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGIN_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#00255e]/95 via-[#00337f]/80 to-[#00337f]/40" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand panel */}
        <div className="flex flex-1 flex-col justify-between gap-10 p-8 text-white lg:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[12px] bg-white/15 shadow-[0_4px_14px_rgba(0,0,0,0.25)] backdrop-blur">
              <span className="text-[22px] font-extrabold tracking-[-0.03em] text-[#FFC61E]">
                N
              </span>
            </div>
            <div className="leading-[1.05]">
              <div className="text-[18px] font-extrabold tracking-[0.02em]">
                NSIA
              </div>
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/70">
                ASSURANCES
              </div>
            </div>
          </div>

          <div className="hidden max-w-md lg:block">
            <h1 className="text-[40px] leading-[1.08] font-extrabold tracking-[-0.03em]">
              Votre espace de gestion, au même endroit.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/80">
              Pilotez contrats, sinistres, clients et réseau de distribution
              depuis un tableau de bord unique.
            </p>
          </div>

          <div className="text-[12px] text-white/60">
            © 2026 NSIA Assurances. Tous droits réservés.
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full items-center justify-center p-6 lg:w-[520px] lg:p-12">
          <Card className="w-full max-w-[400px] gap-0 rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,20,60,0.35)]">
            <div className="mb-6">
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
                Connexion
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                Accédez à votre back-office NSIA Assurances.
              </p>
            </div>

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
                    required
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0]}
                  />
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={fieldValidators('password')}
              >
                {(field) => (
                  <FormField
                    id="password"
                    label="Mot de passe"
                    type="password"
                    required
                    value={field.state.value}
                    onChange={field.handleChange}
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
                    disabled={isSubmitting}
                    className="mt-1 h-11 rounded-[11px] text-[14px] shadow-[0_4px_14px_rgba(0,51,127,0.25)]"
                  >
                    {isSubmitting ? 'Connexion…' : 'Se connecter'}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-5 text-center">
              <Link
                to="/forgot-password"
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
