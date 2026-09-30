import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { z } from 'zod'
import { updateUser } from '#/services/users'
import type { UserResponse } from '#/services/users'
import { FormField } from '#/components/forms/FormField'
import { Button } from '#/components/ui/button'
import { SectionCard } from '#/components/layout/SectionCard'
import { useUnsavedChangesGuard } from '#/components/forms/unsaved-changes'
import { isPlaceholderPhone } from '#/lib/admin-roles'

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'adresse email n'est pas valide"),
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  addressLine1: z.string().min(1, "L'adresse est requise"),
  addressLine2: z.string().optional(),
})

const FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', required: true },
  { name: 'lastName', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true },
  { name: 'addressLine1', label: 'Adresse', type: 'text', required: true },
  {
    name: 'addressLine2',
    label: 'Adresse (complément)',
    type: 'text',
    required: false,
  },
] as const

/** Explications sous les champs que l'API oblige à renseigner. */
function hintFor(name: string, value: string): string | undefined {
  if (name === 'addressLine1')
    return 'Requise par l’API pour enregistrer le profil ; une adresse professionnelle convient.'
  if (name === 'phoneNumber' && isPlaceholderPhone(value))
    return 'Numéro provisoire : renseignez votre vrai numéro.'
  return undefined
}

export function ProfileInfoForm({ user }: { user: UserResponse }) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (value: z.infer<typeof schema>) => updateUser(user.id, value),
    onSuccess: () => {
      // Le nom/email affichés dans la sidebar viennent de `me` ; on rafraîchit
      // les deux caches pour refléter la mise à jour immédiatement.
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['user', user.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Profil mis à jour')
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2 ?? '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync(value)
        // Les valeurs enregistrées deviennent la référence : plus « modifié ».
        form.reset(value)
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409)
            setServerError('Un utilisateur avec cet email existe déjà.')
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
      title="Informations personnelles"
      description="Mettez à jour votre nom, vos coordonnées et votre adresse."
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
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(({ name, label, type, required }) => (
              <form.Field
                key={name}
                name={name}
                validators={
                  required
                    ? {
                        onBlur: ({ value }) => {
                          const result = schema.shape[name].safeParse(value)
                          return result.success
                            ? undefined
                            : result.error.issues[0].message
                        },
                        onSubmit: ({ value }) => {
                          const result = schema.shape[name].safeParse(value)
                          return result.success
                            ? undefined
                            : result.error.issues[0].message
                        },
                      }
                    : undefined
                }
              >
                {(field) => (
                  <div
                    className={
                      name.startsWith('address') ? 'sm:col-span-2' : undefined
                    }
                  >
                    <FormField
                      id={name}
                      label={label}
                      type={type}
                      required={required}
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      error={field.state.meta.errors[0]}
                      hint={hintFor(name, field.state.value)}
                    />
                  </div>
                )}
              </form.Field>
            ))}
          </div>
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
            {isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
