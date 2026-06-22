import { useState, useRef } from 'react'
import type { PermissionResponse } from '#/services/roles'

interface PermissionsAutocompleteProps {
  selected: PermissionResponse[]
  onChange: (perms: PermissionResponse[]) => void
  allPermissions: PermissionResponse[]
}

export function PermissionsAutocomplete({ selected, onChange, allPermissions }: PermissionsAutocompleteProps) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedIds = new Set(selected.map((p) => p.id))
  const suggestions = allPermissions.filter(
    (p) => !selectedIds.has(p.id) && p.name.toLowerCase().includes(input.toLowerCase()),
  )

  function add(p: PermissionResponse) {
    onChange([...selected, p])
    setInput('')
    setOpen(false)
  }

  function remove(id: number) {
    onChange(selected.filter((p) => p.id !== id))
  }

  return (
    <div ref={ref}>
      <div>
        {selected.map((p) => (
          <span key={p.id}>
            {p.name}{' '}
            <button type="button" onClick={() => remove(p.id)}>×</button>
            {' '}
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Rechercher une permission..."
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && input && suggestions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #ccc', position: 'absolute', background: '#fff', zIndex: 10, maxHeight: '160px', overflowY: 'auto', minWidth: '260px' }}>
          {suggestions.map((p) => (
            <li key={p.id} onMouseDown={() => add(p)} style={{ padding: '6px 10px', cursor: 'pointer' }}>
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
