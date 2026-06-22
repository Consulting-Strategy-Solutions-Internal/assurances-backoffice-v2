import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { getRoles, getPermissions, createRole, addPermissionToRole, type PermissionResponse } from '#/services/roles'
import { TemplateSelector } from '#/components/roles/TemplateSelector'
import { PermissionsAutocomplete } from '#/components/roles/PermissionsAutocomplete'

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
      const templateRole = allRoles?.content.find((r) => r.id === Number(templateId))
      const templatePerms = (templateRole?.permissions ?? []).filter((p) => !excludedPermIds.has(p.id))
      const templateIds = new Set(templatePerms.map((p) => p.id))
      const allToAdd = [...templatePerms, ...manualPerms.filter((p) => !templateIds.has(p.id))]
      if (allToAdd.length > 0) {
        await Promise.all(allToAdd.map((p) => addPermissionToRole(newRole.id, p.id)))
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

  const templateRole = allRoles?.content.find((r) => r.id === Number(templateId))
  const templatePermIds = new Set(templateRole?.permissions.map((p) => p.id) ?? [])
  const availableForManual = (allPerms?.content ?? []).filter((p) => !templatePermIds.has(p.id))

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
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
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
          <div>
            <label htmlFor="name">Nom du rôle <span style={{ color: 'red' }}>*</span></label>
            <br />
            <input
              id="name"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              style={field.state.meta.errors.length > 0 ? { outline: '2px solid red' } : undefined}
            />
            {field.state.meta.errors.length > 0 && (
              <p style={{ color: 'red', margin: '4px 0 0' }}>{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div>
            <label htmlFor="description">Description</label>
            <br />
            <input
              id="description"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <TemplateSelector
        templateId={templateId}
        allRoles={allRoles?.content ?? []}
        excludedPermIds={excludedPermIds}
        onTemplateChange={handleTemplateChange}
        onTogglePermission={handleTogglePermission}
      />

      <div style={{ position: 'relative' }}>
        <label>Ajouter des permissions supplémentaires</label>
        <br />
        <PermissionsAutocomplete
          selected={manualPerms}
          onChange={setManualPerms}
          allPermissions={availableForManual}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button type="submit" disabled={isPending}>{isPending ? 'Création...' : 'Créer le rôle'}</button>
        <button type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  )
}
