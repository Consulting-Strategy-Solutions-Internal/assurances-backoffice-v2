import type { RoleResponse, PermissionResponse } from '#/services/roles'

interface TemplateSelectorProps {
  templateId: number | ''
  allRoles: RoleResponse[]
  excludedPermIds: Set<number>
  onTemplateChange: (id: number | '') => void
  onTogglePermission: (id: number) => void
}

export function TemplateSelector({
  templateId,
  allRoles,
  excludedPermIds,
  onTemplateChange,
  onTogglePermission,
}: TemplateSelectorProps) {
  const templateRole = allRoles.find((r) => r.id === Number(templateId))

  return (
    <div>
      <label htmlFor="template">Hériter d'un rôle template (optionnel)</label>
      <br />
      <select
        id="template"
        value={templateId}
        onChange={(e) =>
          onTemplateChange(e.target.value === '' ? '' : Number(e.target.value))
        }
      >
        <option value="">Aucun template</option>
        {allRoles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {templateRole && templateRole.permissions.length > 0 && (
        <div>
          <p style={{ margin: '8px 0 4px' }}>
            Permissions héritées (décochez pour exclure) :
          </p>
          {templateRole.permissions.map((p: PermissionResponse) => (
            <label key={p.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={!excludedPermIds.has(p.id)}
                onChange={() => onTogglePermission(p.id)}
              />{' '}
              {p.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
