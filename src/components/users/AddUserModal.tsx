import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { createUser } from '#/services/users'
import { getRoles } from '#/services/roles'
import { FormDialog } from '#/components/forms/FormDialog'
import { FormField } from '#/components/forms/FormField'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

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
  roleId: z.number({ message: 'Le rôle est requis' }).min(1, 'Le rôle est requis'),
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

interface AddUserModalProps {
  onClose: () => void
}

export function AddUserModal({ onClose }: AddUserModalProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      roleId: 0,
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      try {
        await mutateAsync(value)
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

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Administrateurs"
      title="Inviter un administrateur"
      description="Créez un compte interne et attribuez-lui un rôle."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : "Créer l'administrateur"}
      pending={isPending}
      error={serverError}
    >
      <form.Field
        name="roleId"
        validators={{
          onBlur: ({ value }) =>
            !value || value === 0 ? 'Le rôle est requis' : undefined,
          onSubmit: ({ value }) =>
            !value || value === 0 ? 'Le rôle est requis' : undefined,
        }}
      >
        {(field) => {
          const error = field.state.meta.errors[0]
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roleId" className="text-[13px]">
                Rôle<span className="text-destructive">*</span>
              </Label>
              <Select
                value={field.state.value ? String(field.state.value) : ''}
                onValueChange={(v) => {
                  field.handleChange(Number(v))
                  field.handleBlur()
                }}
              >
                <SelectTrigger
                  id="roleId"
                  aria-invalid={!!error}
                  className="h-10 w-full rounded-[10px]"
                >
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {rolesData?.content.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && (
                <p className="text-[12px] font-medium text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>

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
            <FormField
              id={name}
              label={label}
              type={type}
              required={required}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
