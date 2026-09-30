import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { changeMyPassword } from '#/services/users'
import { FormField } from '#/components/forms/FormField'
import { Button } from '#/components/ui/button'
import { SectionCard } from '#/components/layout/SectionCard'
import { useUnsavedChangesGuard } from '#/components/forms/unsaved-changes'

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

  const dirty = useStore(form.store, (s) => !s.isDefaultValue)
  const { dialog: guardDialog } = useUnsavedChangesGuard(dirty)

  return (
    <SectionCard
      title="Mot de passe"
      description="Choisissez un mot de passe d’au moins 8 caractères."
      bodyClassName="pb-0"
    >
      {guardDialog}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="flex flex-col gap-4">
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
                    autoComplete={
                      name === 'currentPassword'
                        ? 'current-password'
                        : 'new-password'
                    }
                    revealable
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
            <p className="rounded-lg bg-[#fbe9e9] px-3 py-2.5 text-[13px] font-medium text-[#c0392b]">
              {serverError}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 z-10 -mx-6 mt-5 flex justify-end rounded-b-xl border-t bg-card px-6 py-4">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
          >
            {isPending ? 'Mise à jour…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
