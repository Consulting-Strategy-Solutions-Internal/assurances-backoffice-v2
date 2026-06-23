import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getPartner } from '#/services/partners'
import { getUsers } from '#/services/users'
import { Stepper } from '#/components/ui/Stepper'
import { ManagerStep } from '#/components/partners/wizard/ManagerStep'
import { AgenciesStep } from '#/components/partners/wizard/AgenciesStep'
import { SellersStep } from '#/components/partners/wizard/SellersStep'

export const Route = createFileRoute('/_auth/partners_/$partnerId')({
  component: PartnerRelationsPage,
})

const STEPS = ['Manager', 'Agences', 'Agents']

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
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
  })

  if (isLoading)
    return (
      <div style={{ padding: '24px' }}>
        <p>Chargement...</p>
      </div>
    )
  if (error || !partner) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: 'red' }}>Partenaire introuvable.</p>
        <Link to="/partners">← Retour aux partenaires</Link>
      </div>
    )
  }

  const hasManager = (usersData?.content ?? []).some((u) => u.partnerId === id)
  const isLastStep = step === STEPS.length - 1

  // On ne peut pas dépasser l'étape Manager tant qu'aucun manager n'est rattaché.
  function goToStep(target: number) {
    if (target > 0 && !hasManager) return
    setStep(target)
  }

  return (
    <div style={{ padding: '24px' }}>
      <Link to="/partners">← Retour aux partenaires</Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        <h1>Relations · {partner.name}</h1>
        <span style={{ color: '#6b7280' }}>
          Code : {partner.distributorCode}
        </span>
      </div>

      <Stepper steps={STEPS} current={step} onStepClick={goToStep} />

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
        {step === 0 && <ManagerStep partnerId={id} />}
        {step === 1 && <AgenciesStep partnerId={id} />}
        {step === 2 && <SellersStep partnerId={id} />}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '24px',
        }}
      >
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          ← Précédent
        </button>
        {isLastStep ? (
          <button type="button" onClick={() => navigate({ to: '/partners' })}>
            Terminer
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step === 0 && !hasManager && (
              <span style={{ color: '#b45309', fontSize: '13px' }}>
                Rattachez d'abord un manager pour continuer.
              </span>
            )}
            <button
              type="button"
              disabled={step === 0 && !hasManager}
              onClick={() => goToStep(step + 1)}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
