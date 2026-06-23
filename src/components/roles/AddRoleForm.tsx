import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  getRoles,
  getPermissions,
  createRole,
  addPermissionToRole,
} from '#/services/roles'
import type { PermissionResponse } from '#/services/roles'
import { TemplateSelector } from '#/components/roles/TemplateSelector'
import { PermissionsAutocomplete } from '#/components/roles/PermissionsAutocomplete'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { FormField } from '#/components/forms/FormField'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
})

interface AddRoleFormProps {
  onCancel: () => void
}

export function AddRoleForm({ onCancel }: AddRoleFormProps) {
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = useState<number | ''>('')
  const [excludedPermIds, setExcludedPermIds] = useState<Set<number>>(new Set())
  const [manualPerms, setManualPerms] = useState<PermissionResponse[]>([])

  const { data: allRoles } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { data: allPerms } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: () => getPermissions(0, 500),
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const newRole = await createRole(values)
      const templateRole = allRoles?.content.find(
        (r) => r.id === Number(templateId),
      )
      const templatePerms = (templateRole?.permissions ?? []).filter(
        (p) => !excludedPermIds.has(p.id),
      )
      const templateIds = new Set(templatePerms.map((p) => p.id))
      const allToAdd = [
        ...templatePerms,
        ...manualPerms.filter((p) => !templateIds.has(p.id)),
      ]
      if (allToAdd.length > 0) {
        await Promise.all(
          allToAdd.map((p) => addPermissionToRole(newRole.id, p.id)),
        )
      }
      return newRole
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onCancel()
    },
  })

  const form = useForm({
    defaultValues: { name: '', description: '' },
    onSubmit: async ({ value }) => mutateAsync(value),
  })

  const templateRole = allRoles?.content.find(
    (r) => r.id === Number(templateId),
  )
  const templatePermIds = new Set(
    templateRole?.permissions.map((p) => p.id) ?? [],
  )
  const availableForManual = (allPerms?.content ?? []).filter(
    (p) => !templatePermIds.has(p.id),
  )

  function handleTemplateChange(id: number | '') {
    setTemplateId(id)
    setExcludedPermIds(new Set())
  }

  function handleTogglePermission(id: number) {
    setExcludedPermIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="text-[16px] font-bold tracking-[-0.01em]">
        Nouveau rôle
      </div>

      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const result = schema.shape.name.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const result = schema.shape.name.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="name"
            label="Nom du rôle"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormField
            id="description"
            label="Description"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <TemplateSelector
        templateId={templateId}
        allRoles={allRoles?.content ?? []}
        excludedPermIds={excludedPermIds}
        onTemplateChange={handleTemplateChange}
        onTogglePermission={handleTogglePermission}
      />

      <div className="relative flex flex-col gap-1.5">
        <Label className="text-[13px]">
          Ajouter des permissions supplémentaires
        </Label>
        <PermissionsAutocomplete
          selected={manualPerms}
          onChange={setManualPerms}
          allPermissions={availableForManual}
        />
      </div>

      <div className="flex gap-2.5 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
        >
          {isPending ? 'Création…' : 'Créer le rôle'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-[11px]"
          onClick={onCancel}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
