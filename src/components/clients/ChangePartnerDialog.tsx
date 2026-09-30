import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { WarningBanner } from '#/components/ia-products/shared/WarningBanner'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import {
  NO_PARTNER,
  mapOwnerPartnerError,
  ownerPartnerId,
  partnerOptions,
} from '#/lib/client-partner'
import { clientsKeys, reassignClientPartner } from '#/services/clients'
import { getAllPartners, partnersAllKey } from '#/services/partners'

/**
 * NSIA arbitration (after a seller's « contactez NSIA »): attaches the client
 * to another partner, or leaves it without partner. The API does not expose
 * the current partner, so nothing is preselected.
 */
export function ChangePartnerDialog({
  clientId,
  clientName,
  onClose,
}: {
  clientId: number
  clientName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const partnersQuery = useQuery({
    queryKey: partnersAllKey,
    queryFn: getAllPartners,
    retry: false,
  })
  const partners = partnersQuery.data?.items ?? []
  const options = [
    { value: NO_PARTNER, label: 'Aucun partenaire' },
    ...partnerOptions(partners),
  ]
  const chosen = options.find((o) => o.value === value)

  const mutation = useMutation({
    mutationFn: (partnerId: number | null) =>
      reassignClientPartner(clientId, partnerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientsKeys.all })
      toast.success(
        value === NO_PARTNER
          ? `${clientName} n’a plus de partenaire.`
          : `Partenaire de ${clientName} : ${chosen?.label ?? 'modifié'}.`,
      )
      onClose()
    },
    onError: (failure) => {
      const mapped = mapOwnerPartnerError(failure)
      setError(mapped.message)
      if (mapped.partnerGone) {
        setValue('')
        void partnersQuery.refetch()
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Arbitrage NSIA"
      title="Changer de partenaire"
      description={`Choisissez le partenaire dont les vendeurs suivront ${clientName}.`}
      submitLabel="Confirmer le changement"
      submitDisabled={value === ''}
      pending={mutation.isPending}
      dirty={value !== ''}
      error={error}
      onSubmit={() => {
        if (value === '') return
        setError(null)
        mutation.mutate(ownerPartnerId(value))
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="owner-partner"
            className="text-[13px] font-semibold text-foreground"
          >
            Nouveau partenaire
          </label>
          <SearchableSelect
            id="owner-partner"
            label="Nouveau partenaire"
            value={value}
            onChange={(next) => {
              setValue(next)
              setError(null)
            }}
            allLabel="Choisir un partenaire"
            hideAllOption
            options={options}
            placeholder="Rechercher un partenaire…"
            loading={partnersQuery.isLoading}
            disabled={!!partnersQuery.error}
            disabledHint={
              partnersQuery.error
                ? 'Impossible de charger les partenaires.'
                : undefined
            }
            className="w-full @xl/main:w-full"
          />
          <p className="text-[12px] text-muted-foreground">
            Le partenaire actuel n’est pas affiché : l’API ne le fournit pas.
          </p>
        </div>
        {chosen && (
          <WarningBanner title="Ce qui va changer">
            {value === NO_PARTNER
              ? 'Le client n’aura plus de partenaire : les vendeurs de l’ancien partenaire n’y auront plus accès. Le premier vendeur qui lui fera un devis le rattachera à son partenaire.'
              : `Le client passe à ${chosen.label} : les vendeurs de l’ancien partenaire n’y auront plus accès.`}{' '}
            Les devis et contrats déjà faits ne changent pas ; seuls la fiche
            client et les prochains devis suivent ce choix.
          </WarningBanner>
        )}
      </div>
    </FormDialog>
  )
}
