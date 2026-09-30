import { Mail, Phone } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { ClientResponse } from '#/services/clients'

function Icon({
  ok,
  label,
  children,
}: {
  ok: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn(
        'flex size-7 items-center justify-center rounded-full',
        ok ? 'bg-[#e7f6ee] text-[#167347]' : 'bg-[#f0f1f4] text-[#a0a8b5]',
      )}
    >
      {children}
    </span>
  )
}

/** Compact phone/email verification indicator (icon + tooltip). */
export function VerificationIcons({
  client,
}: {
  client: Pick<ClientResponse, 'phoneVerifiedAt' | 'emailVerifiedAt' | 'email'>
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon
        ok={!!client.phoneVerifiedAt}
        label={
          client.phoneVerifiedAt ? 'Téléphone vérifié' : 'Téléphone non vérifié'
        }
      >
        <Phone className="size-3.5" />
      </Icon>
      <Icon
        ok={!!client.emailVerifiedAt}
        label={
          client.emailVerifiedAt
            ? 'Email vérifié'
            : client.email
              ? 'Email non vérifié'
              : 'Email non renseigné'
        }
      >
        <Mail className="size-3.5" />
      </Icon>
    </div>
  )
}
