import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { isAxiosError } from 'axios'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { forgotPassword } from '#/services/auth'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { FormField } from '#/components/forms/FormField'
import { AuthShell } from '#/components/auth/AuthShell'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

const emailSchema = z
  .string()
  .min(1, "L'email est requis")
  .email("L'adresse email n'est pas valide")

/** First Zod error for the email field, or undefined when valid. */
function validateEmail(value: string) {
  const result = emailSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0].message
}

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await forgotPassword(value.email)
        setSubmitted(true)
      } catch (error) {
        if (isAxiosError(error) && error.response?.status) {
          setServerError('Une erreur est survenue. Veuillez réessayer.')
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <AuthShell>
      <Card className="w-full max-w-[400px] gap-0 rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,20,60,0.35)]">
        {submitted ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
              Vérifiez votre boîte mail
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Si un compte est associé à{' '}
              <span className="font-semibold text-foreground">
                {form.state.values.email}
              </span>
              , vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-6 h-11 w-full rounded-[11px] text-[14px]"
            >
              <Link to="/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
                Mot de passe oublié
              </h2>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                Entrez votre email, nous vous enverrons un lien de
                réinitialisation.
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
                name="email"
                validators={{
                  onBlur: ({ value }) => validateEmail(value),
                  onChange: ({ value, fieldApi }) =>
                    fieldApi.state.meta.isBlurred
                      ? validateEmail(value)
                      : undefined,
                }}
              >
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
                    {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
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
