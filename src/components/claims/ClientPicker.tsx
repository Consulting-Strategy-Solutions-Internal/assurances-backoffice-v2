import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { clientFullName, filterClients, formatPhone } from '#/lib/clients'
import { clientsKeys, getAllClients } from '#/services/clients'

const MAX_LISTED = 50

/**
 * Searchable picker over ALL clients (name, phone, email, address). The list
 * is loaded whole (the API has no text search) and filtered locally, so no
 * client is ever out of reach; only the first matches are rendered.
 */
export function ClientPicker({
  id,
  label,
  value,
  onChange,
  allLabel,
  hideAllOption,
  className,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  hideAllOption?: boolean
  className?: string
}) {
  const [query, setQuery] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: clientsKeys.everyone('lastName,asc'),
    queryFn: () => getAllClients('lastName,asc'),
    staleTime: 60_000,
    retry: false,
  })
  const clients = useMemo(() => data?.items ?? [], [data])

  const options = useMemo(
    () =>
      filterClients(clients, {
        query,
        verification: 'all',
        gender: 'all',
      })
        .slice(0, MAX_LISTED)
        .map((client) => ({
          value: String(client.id),
          label: clientFullName(client),
          hint: `${formatPhone(client.phoneNumber)} · Client #${client.id}`,
        })),
    [clients, query],
  )
  const selected = clients.find((c) => String(c.id) === value)

  return (
    <SearchableSelect
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      allLabel={allLabel}
      hideAllOption={hideAllOption}
      placeholder="Nom, téléphone, email…"
      emptyLabel={
        error ? 'Impossible de charger les clients.' : 'Aucun client trouvé.'
      }
      options={options}
      onSearch={setQuery}
      loading={isLoading}
      selectedLabel={selected ? clientFullName(selected) : `Client #${value}`}
      className={className}
    />
  )
}
