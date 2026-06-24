import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { changeMyPassword } from '#/services/users'
import { FormField } from '#/components/forms/FormField'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

const validators = {
  currentPassword: (value: string) =>
    value.length < 1 ? 'Le mot de passe actuel est requis' : undefined,
  newPassword: (value: string) =>
    value.length < 8
      ? 'Le mot de passe doit contenir au moins 8 caractères'
      : undefined,
} as const

const FIELDS = [
  { name: 'currentPassword', label: 'Mot de passe actuel' },
  { name: 'newPassword', label: 'Nouveau mot de passe' },
  { name: 'confirmPassword', label: 'Confirmer le nouveau mot de passe' },
] as const

export function ProfilePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: () => toast.success('Mot de passe mis à jour'),
  })

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        })
        form.reset()
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 400 || status === 401 || status === 403)
            setServerError('Le mot de passe actuel est incorrect.')
          else if (status && status >= 500)
            setServerError('Une erreur serveur est survenue.')
          else setServerError('Une erreur est survenue. Veuillez réessayer.')
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="gap-0 border-b p-6">
        <CardTitle className="text-[17px] font-extrabold tracking-[-0.02em]">
          Mot de passe
        </CardTitle>
        <CardDescription className="mt-[3px] text-[13.5px]">
          Choisissez un mot de passe d'au moins 8 caractères.
        </CardDescription>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <CardContent className="flex flex-col gap-4 p-6">
          {FIELDS.map(({ name, label }) => {
            const validate = ({ value }: { value: string }) => {
              if (name === 'confirmPassword')
                return value !== form.getFieldValue('newPassword')
                  ? 'Les mots de passe ne correspondent pas'
                  : undefined
              return validators[name](value)
            }
            return (
              <form.Field
                key={name}
                name={name}
                validators={{ onBlur: validate, onSubmit: validate }}
              >
                {(field) => (
                  <FormField
                    id={name}
                    label={label}
                    type="password"
                    required
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    error={field.state.meta.errors[0]}
                  />
                )}
              </form.Field>
            )
          })}
          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
              {serverError}
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-end border-t p-6">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
          >
            {isPending ? 'Mise à jour…' : 'Changer le mot de passe'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
