import { SearchInput } from '#/components/ui/SearchInput'

type VerifiedFilter = 'all' | 'yes' | 'no'

interface UsersFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  filterVerified: VerifiedFilter
  onFilterVerifiedChange: (v: VerifiedFilter) => void
}

export function UsersFilters({ search, onSearchChange, filterVerified, onFilterVerifiedChange }: UsersFiltersProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', margin: '12px 0' }}>
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Rechercher par nom ou email..."
      />
      <select
        value={filterVerified}
        onChange={(e) => onFilterVerifiedChange(e.target.value as VerifiedFilter)}
      >
        <option value="all">Email vérifié : tous</option>
        <option value="yes">Email vérifié : oui</option>
        <option value="no">Email vérifié : non</option>
      </select>
    </div>
  )
}
