import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, ShieldCheck } from 'lucide-react'
import { getMe } from '#/services/auth'
import type { MeResponse } from '#/services/auth'
import { getUser } from '#/services/users'
import type { UserResponse } from '#/services/users'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { ProfileInfoForm } from '#/components/profile/ProfileInfoForm'
import { ProfilePasswordForm } from '#/components/profile/ProfilePasswordForm'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { EntityAvatar } from '#/components/layout/EntityAvatar'
import { formatPersonName } from '#/lib/people'
import { formatPhone } from '#/lib/clients'
import { formatRoleName, isPlaceholderPhone } from '#/lib/admin-roles'
import { Skeleton } from '#/components/ui/skeleton'
import { Card } from '#/components/ui/card'

export const Route = createFileRoute('/_auth/profil')({
  head: pageHead('Mon profil'),
  component: ProfilePage,
})

function ProfilePage() {
  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  // `/auth/me` ne renvoie qu'un profil allégé ; on récupère le détail complet
  // (téléphone, adresse) requis par le formulaire de mise à jour.
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', me?.id],
    queryFn: () => getUser(me!.id),
    enabled: !!me?.id,
    retry: false,
  })

  // Si le détail (`/users/{id}`) échoue, on retombe sur le profil allégé de
  // `me` : le formulaire reste utilisable, l'admin complète tél./adresse.
  const effectiveUser: UserResponse | undefined =
    user ??
    (me
      ? {
          id: me.id,
          role: me.role,
          firstName: me.firstName,
          lastName: me.lastName,
          email: me.email,
          phoneNumber: '',
          addressLine1: '',
          addressLine2: '',
          emailVerified: false,
          agencyIds: [],
          createdAt: '',
          updatedAt: '',
        }
      : undefined)

  const firstName = user?.firstName ?? me?.firstName ?? ''
  const lastName = user?.lastName ?? me?.lastName ?? ''
  const fullName = formatPersonName(firstName, lastName) || 'Mon profil'
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '··'

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Mon profil"
        subtitle="Consultez et mettez à jour vos informations personnelles."
      />

      <Card className="mb-0 gap-0 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <EntityAvatar
            name={fullName}
            initials={initials}
            className="size-[72px] text-2xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[22px] leading-tight font-extrabold tracking-[-0.03em]">
                {fullName}
              </h2>
              {(user?.role ?? me?.role) && (
                <StatusPill tone="info">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" />
                    {formatRoleName(user?.role ?? me?.role ?? '')}
                  </span>
                </StatusPill>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
              {(user?.email ?? me?.email) && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {user?.email ?? me?.email}
                </span>
              )}
              {user && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Phone className="size-3.5" />
                  {isPlaceholderPhone(user.phoneNumber)
                    ? 'Téléphone non renseigné'
                    : formatPhone(user.phoneNumber)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!effectiveUser || (isLoading && !!me) ? (
        <div className="grid gap-[18px] lg:grid-cols-2">
          <Skeleton className="h-[440px] rounded-xl" />
          <Skeleton className="h-[440px] rounded-xl" />
        </div>
      ) : (
        <div className="grid items-start gap-[18px] lg:grid-cols-2">
          <ProfileInfoForm user={effectiveUser} />
          <ProfilePasswordForm />
        </div>
      )}
    </div>
  )
}
