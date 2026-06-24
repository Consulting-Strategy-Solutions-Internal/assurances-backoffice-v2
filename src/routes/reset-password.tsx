import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { ArrowLeft, CheckCircle2, TriangleAlert } from 'lucide-react'
import { resetPassword } from '#/services/auth'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { FormField } from '#/components/forms/FormField'
import { AuthShell } from '#/components/auth/AuthShell'

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
  }),
  component: ResetPasswordPage,
})

const passwordSchema = z
  .string()
  .min(1, 'Le mot de passe est requis')
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')

/** First Zod error for the new password, or undefined when valid. */
function validatePassword(value: string) {
  const result = passwordSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      if (!token) return
      setServerError(null)
      try {
        await resetPassword(token, value.newPassword)
        setDone(true)
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 400 || status === 401 || status === 404) {
            setServerError(
              'Ce lien est invalide ou a expiré. Veuillez en demander un nouveau.',
            )
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

  // Lien ouvert sans token (ou token retiré de l'URL) → rien à réinitialiser.
  if (!token) {
    return (
      <AuthShell>
        <Card className="w-full max-w-[400px] gap-0 rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,20,60,0.35)]">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
              Lien invalide
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Ce lien de réinitialisation est invalide ou incomplet. Demandez un
              nouveau lien depuis la page « Mot de passe oublié ».
            </p>
            <Button
              asChild
              className="mt-6 h-11 w-full rounded-[11px] text-[14px]"
            >
              <Link to="/forgot-password">Demander un nouveau lien</Link>
            </Button>
          </div>
        </Card>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-[400px] gap-0 rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,20,60,0.35)]">
        {done ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
              Mot de passe réinitialisé
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Votre mot de passe a été mis à jour. Vous pouvez maintenant vous
              connecter avec vos nouveaux identifiants.
            </p>
            <Button
              className="mt-6 h-11 w-full rounded-[11px] text-[14px]"
              onClick={() => navigate({ to: '/login' })}
            >
              Se connecter
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
                Nouveau mot de passe
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                Choisissez un nouveau mot de passe pour votre compte.
              </p>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <form.Field
                name="newPassword"
                validators={{
                  onBlur: ({ value }) => validatePassword(value),
                  onChange: ({ value, fieldApi }) =>
                    fieldApi.state.meta.isBlurred
                      ? validatePassword(value)
                      : undefined,
                }}
              >
                {(field) => (
                  <FormField
                    id="newPassword"
                    label="Nouveau mot de passe"
                    type="password"
                    required
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0]}
                  />
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ['newPassword'],
                  onBlur: ({ value, fieldApi }) =>
                    value !== fieldApi.form.getFieldValue('newPassword')
                      ? 'Les mots de passe ne correspondent pas'
                      : undefined,
                  onChange: ({ value, fieldApi }) =>
                    fieldApi.state.meta.isBlurred &&
                    value !== fieldApi.form.getFieldValue('newPassword')
                      ? 'Les mots de passe ne correspondent pas'
                      : undefined,
                }}
              >
                {(field) => (
                  <FormField
                    id="confirmPassword"
                    label="Confirmer le mot de passe"
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
                    {isSubmitting
                      ? 'Réinitialisation…'
                      : 'Réinitialiser le mot de passe'}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-5 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="size-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </Card>
    </AuthShell>
  )
}
