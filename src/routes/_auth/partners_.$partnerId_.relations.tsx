import { pageHead } from '#/lib/page-title'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { getPartner } from '#/services/partners'
import { useAllUsers } from '#/components/users/use-all-users'
import { Stepper } from '#/components/ui/Stepper'
import { ManagerStep } from '#/components/partners/wizard/ManagerStep'
import { AgenciesStep } from '#/components/partners/wizard/AgenciesStep'
import { SellersStep } from '#/components/partners/wizard/SellersStep'
import { StatusPill } from '#/components/dashboard/StatusPill'
import { BackLink } from '#/components/layout/BackLink'
import { EmptyState } from '#/components/layout/EmptyState'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { mapClaimError } from '#/lib/claims'

export const Route = createFileRoute('/_auth/partners_/$partnerId_/relations')({
  head: pageHead('Relations du partenaire'),
  component: PartnerRelationsPage,
})

const STEPS = ['Manager', 'Agences', 'Agents']

/** Parcours guidé de rattachement : manager, puis agences, puis agents. */
function PartnerRelationsPage() {
  const { partnerId } = Route.useParams()
  const id = Number(partnerId)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => getPartner(id),
    retry: false,
  })

  // Même clé que ManagerStep : sert à savoir si un manager est déjà rattaché.
  const { data: usersData } = useAllUsers()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[18px]">
        <Skeleton className="h-16 w-96 max-w-full rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }
  if (error || !partner) {
    const kind = error ? mapClaimError(error).kind : 'not-found'
    return (
      <div className="flex flex-col gap-[18px]">
        <BackLink to="/partners/$partnerId" params={{ partnerId }}>
          Retour au partenaire
        </BackLink>
        <EmptyState
          variant="card"
          icon={TriangleAlert}
          title={
            kind === 'forbidden'
              ? 'Accès refusé.'
              : kind === 'not-found'
                ? 'Partenaire introuvable'
                : 'Impossible de charger le partenaire'
          }
          description={
            kind === 'forbidden'
              ? 'Vous n’avez pas les droits nécessaires pour consulter ce partenaire.'
              : kind === 'not-found'
                ? 'Ce partenaire n’existe pas ou a été supprimé.'
                : 'Une erreur est survenue. Réessayez dans un instant.'
          }
          action={
            <Button asChild>
              <Link to="/partners">Retour aux partenaires</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const hasManager = (usersData?.items ?? []).some((u) => u.partnerId === id)
  const isLastStep = step === STEPS.length - 1

  // On ne peut pas dépasser l'étape Manager tant qu'aucun manager n'est rattaché.
  function goToStep(target: number) {
    if (target > 0 && !hasManager) return
    setStep(target)
  }

  return (
    <>
      <div className="mb-3">
        <BackLink to="/partners/$partnerId" params={{ partnerId }}>
          Retour au partenaire
        </BackLink>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            Ajouter une relation · {partner.name}
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Rattachez le manager, les agences et les agents de ce partenaire.
          </p>
        </div>
        <StatusPill tone="info">Code {partner.distributorCode}</StatusPill>
      </div>

      <Card className="gap-0 p-6">
        <Stepper steps={STEPS} current={step} onStepClick={goToStep} />
        <Separator className="my-5" />
        {step === 0 && <ManagerStep partnerId={id} />}
        {step === 1 && <AgenciesStep partnerId={id} />}
        {step === 2 && <SellersStep partnerId={id} />}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-[11px]"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft />
          Précédent
        </Button>
        {isLastStep ? (
          <Button
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            onClick={() =>
              navigate({ to: '/partners/$partnerId', params: { partnerId } })
            }
          >
            Terminer
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            {step === 0 && !hasManager && (
              <span className="text-[13px] text-[#8a6600]">
                Rattachez d’abord un manager pour continuer.
              </span>
            )}
            <Button
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              disabled={step === 0 && !hasManager}
              onClick={() => goToStep(step + 1)}
            >
              Suivant
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
