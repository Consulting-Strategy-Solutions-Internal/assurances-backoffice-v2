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
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Card } from '#/components/ui/card'

export const Route = createFileRoute('/_auth/profil')({ component: ProfilePage })

function ProfilePage() {
  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })

  // `/auth/me` ne renvoie qu'un profil allégé ; on récupère le détail complet
  // (téléphone, adresse) requis par le formulaire de mise à jour.
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', me?.id],
    queryFn: () => getUser(me!.id),
    enabled: !!me?.id,
    retry: false,
  })

  if (error) console.error('[profil]', error)

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
  const fullName = `${firstName} ${lastName}`.trim() || 'Mon profil'
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '··'

  return (
    <>
      <PageHeader
        title="Mon profil"
        subtitle="Consultez et mettez à jour vos informations personnelles"
      />

      <Card className="mb-6 py-0">
        <div className="flex flex-wrap items-center gap-5 p-6">
          <Avatar className="size-[60px]">
            <AvatarFallback className="bg-primary text-[20px] font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[20px] font-extrabold tracking-[-0.025em]">
                {fullName}
              </h2>
              {(user?.role || me?.role) && (
                <Badge className="gap-1.5 rounded-full border-transparent bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
                  <ShieldCheck className="size-3.5" />
                  {user?.role ?? me?.role}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
              {(user?.email || me?.email) && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {user?.email ?? me?.email}
                </span>
              )}
              {user?.phoneNumber && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {user.phoneNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!effectiveUser || (isLoading && !!me) ? (
        <Card className="py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileInfoForm user={effectiveUser} />
          <ProfilePasswordForm />
        </div>
      )}
    </>
  )
}
