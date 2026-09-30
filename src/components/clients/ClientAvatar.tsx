import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { clientInitials } from '#/lib/clients'
import type { ClientResponse } from '#/services/clients'

/** Client avatar: `EntityAvatar` toned by gender (pink = femme, blue = homme). */
export function ClientAvatar({
  client,
  className,
}: {
  client: Pick<ClientResponse, 'firstName' | 'lastName' | 'gender'>
  className?: string
}) {
  return (
    <EntityAvatar
      initials={clientInitials(client)}
      tone={client.gender === 'FEMME' ? 'pink' : 'blue'}
      className={className}
    />
  )
}
