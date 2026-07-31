import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '#/components/forms/FormField'
import { FormSelect } from '#/components/forms/FormSelect'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { apiErrorMessage } from '#/lib/api-error'
import {
  formatShareTotal,
  validateCommissionScheme,
} from '#/lib/commission-scheme-validation'
import type { CommissionSchemeDraft } from '#/lib/commission-scheme-validation'
import {
  createCommissionScheme,
  getCommissionScheme,
  getCommissionSchemes,
  updateCommissionScheme,
} from '#/services/commission-schemes'
import type {
  CommissionLevel,
  CommissionSchemePayload,
} from '#/services/commission-schemes'
import {
  getAllPartners,
  getAllProducts,
  getPartnerNetworkAvailability,
} from '#/services/commission-reference-data'

const EMPTY_DRAFT: CommissionSchemeDraft = {
  partnerId: null,
  productId: null,
  commissionRate: '',
  maxLevel: 1,
  level2PartnerShare: '',
  level2SellerShare: '',
  level3PartnerShare: '',
  level3AgencyShare: '',
  level3SellerShare: '',
}

const NETWORK_MESSAGES: Record<string, string> = {
  'Level 2 scheme requires a direct seller':
    'Le niveau 2 exige au moins un vendeur rattaché directement au partenaire.',
  'Level 2 scheme is forbidden for a partner with agency sellers: their sales are level 3':
    "Le niveau 2 est impossible : ce partenaire possède des vendeurs d'agence, dont les ventes relèvent du niveau 3.",
  'Level 3 scheme requires an agency with a seller':
    'Le niveau 3 exige au moins une agence contenant au moins un vendeur.',
}

function serverSchemeError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object' && 'message' in data) {
      const raw = data.message
      if (typeof raw === 'string' && NETWORK_MESSAGES[raw]) {
        return `${NETWORK_MESSAGES[raw]} Message serveur : ${raw}`
      }
    }
  }
  return apiErrorMessage(error)
}

function initialDraft(
  scheme: Awaited<ReturnType<typeof getCommissionScheme>>,
): CommissionSchemeDraft {
  const value = (rate: number | null) => (rate === null ? '' : String(rate))
  return {
    partnerId: scheme.partnerId,
    productId: scheme.productId,
    commissionRate: value(scheme.commissionRate),
    maxLevel: scheme.maxLevel,
    level2PartnerShare: value(scheme.level2PartnerShare),
    level2SellerShare: value(scheme.level2SellerShare),
    level3PartnerShare: value(scheme.level3PartnerShare),
    level3AgencyShare: value(scheme.level3AgencyShare),
    level3SellerShare: value(scheme.level3SellerShare),
  }
}

interface CommissionSchemeFormPageProps {
  schemeId?: number
}

export function CommissionSchemeFormPage({
  schemeId,
}: CommissionSchemeFormPageProps) {
  const editing = schemeId !== undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<CommissionSchemeDraft>(EMPTY_DRAFT)
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<number | null>(null)
  const schemeQuery = useQuery({
    queryKey: ['commission-scheme', schemeId],
    queryFn: () => getCommissionScheme(schemeId as number),
    enabled: editing,
    retry: false,
  })
  const references = useQuery({
    queryKey: ['commission-references'],
    queryFn: async () => {
      const [partners, products] = await Promise.all([
        getAllPartners(),
        getAllProducts(),
      ])
      return { partners, products }
    },
    retry: false,
  })
  const network = useQuery({
    queryKey: ['partner-commission-network', draft.partnerId],
    queryFn: () => getPartnerNetworkAvailability(draft.partnerId as number),
    enabled: draft.partnerId !== null,
    retry: false,
  })

  useEffect(() => {
    if (schemeQuery.data) setDraft(initialDraft(schemeQuery.data))
  }, [schemeQuery.data])

  const validation = useMemo(
    () =>
      validateCommissionScheme(
        draft,
        schemeQuery.data
          ? {
              partnerId: schemeQuery.data.partnerId,
              productId: schemeQuery.data.productId,
            }
          : undefined,
      ),
    [draft, schemeQuery.data],
  )
  const level2Reason = !network.data
    ? null
    : network.data.directSellers.length === 0
      ? 'Aucun vendeur direct : le niveau 2 exige un vendeur rattaché au partenaire.'
      : network.data.hasAgencySeller
        ? 'Des vendeurs sont rattachés à une agence : leurs ventes exigent le niveau 3.'
        : null
  const level3Reason = !network.data
    ? null
    : network.data.agencies.length === 0
      ? 'Aucune agence : le niveau 3 exige une agence avec vendeur.'
      : !network.data.hasAgencySeller
        ? "Aucune agence ne contient de vendeur : le niveau 3 n'est pas applicable."
        : null
  const selectedLevelReason =
    draft.maxLevel === 2
      ? level2Reason
      : draft.maxLevel === 3
        ? level3Reason
        : null

  const mutation = useMutation({
    mutationFn: (payload: CommissionSchemePayload) =>
      editing
        ? updateCommissionScheme(schemeId, payload)
        : createCommissionScheme(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-schemes'] })
      toast.success(editing ? 'Schéma mis à jour.' : 'Schéma créé.')
      navigate({ to: '/commissions/schemes' })
    },
  })

  const submit = async () => {
    setSubmitted(true)
    setExistingId(null)
    setServerError(null)
    if (!validation.payload || selectedLevelReason) return
    try {
      await mutation.mutateAsync(validation.payload)
    } catch (error) {
      if (
        !editing &&
        isAxiosError(error) &&
        error.response?.status === 409 &&
        draft.partnerId !== null &&
        draft.productId !== null
      ) {
        try {
          const existing = await getCommissionSchemes({
            partnerId: draft.partnerId,
            productId: draft.productId,
            page: 0,
            size: 1,
          })
          setExistingId(existing.content[0]?.id ?? null)
        } catch {
          setExistingId(null)
        }
        setServerError(
          'Un schéma actif existe déjà pour ce couple partenaire / produit.',
        )
      } else {
        setServerError(serverSchemeError(error))
      }
    }
  }
  const update = <TField extends keyof CommissionSchemeDraft>(
    field: TField,
    value: CommissionSchemeDraft[TField],
  ) => setDraft((current) => ({ ...current, [field]: value }))

  if ((editing && schemeQuery.isLoading) || references.isLoading) {
    return (
      <Card className="p-9 text-center text-muted-foreground">Chargement…</Card>
    )
  }
  if (
    (editing && (schemeQuery.error || !schemeQuery.data)) ||
    references.error
  ) {
    return (
      <Card className="p-9 text-center text-destructive">
        Impossible de charger le formulaire.
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/commissions/schemes">
          <ArrowLeft />
          Retour aux schémas
        </Link>
      </Button>
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
          Commissions
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.03em]">
          {editing ? 'Modifier le schéma' : 'Nouveau schéma'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le taux modifié ne vaut que pour les nouveaux contrats. Les parts
          modifiées s'appliquent aux encaissements pas encore distribués, y
          compris ceux rejoués ; aucune distribution historique n'est réécrite.
        </p>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2">
        {['Couple', 'Niveau', 'Répartition'].map((label, index) => (
          <div
            key={label}
            className={`rounded-[10px] border px-3 py-2 text-[12px] font-semibold ${step === index + 1 ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>
      <Card className="p-6">
        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FormSelect
              id="scheme-partner"
              label="Partenaire"
              required
              value={draft.partnerId === null ? '' : String(draft.partnerId)}
              disabled={editing}
              options={(references.data?.partners ?? []).map((item) => ({
                value: String(item.id),
                label: item.name,
              }))}
              onChange={(value) =>
                update('partnerId', value ? Number(value) : null)
              }
              error={submitted ? validation.errors.partnerId : undefined}
            />
            <FormSelect
              id="scheme-product"
              label="Produit"
              required
              value={draft.productId === null ? '' : String(draft.productId)}
              disabled={editing}
              options={(references.data?.products ?? []).map((item) => ({
                value: String(item.id),
                label: item.label,
              }))}
              onChange={(value) =>
                update('productId', value ? Number(value) : null)
              }
              error={submitted ? validation.errors.productId : undefined}
            />
            <div className="md:col-span-2 rounded-[12px] border border-primary/20 bg-primary/[0.03] p-4">
              <FormField
                id="scheme-commission-rate"
                label="Taux de commission négocié (%)"
                required
                type="text"
                value={draft.commissionRate}
                onChange={(value) => update('commissionRate', value)}
                error={
                  draft.commissionRate !== '' || submitted
                    ? validation.errors.commissionRate
                    : undefined
                }
                hint="Pourcentage de la prime nette constituant le pot à répartir pour ce partenaire et ce produit. 0 % signifie que les encaissements seront ignorés."
              />
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                Ce taux est gelé sur chaque contrat à la souscription. Une
                modification ne change jamais les contrats déjà souscrits, même
                lors d'un rejeu.
              </p>
            </div>
            {editing && (
              <p className="md:col-span-2 text-[12.5px] text-muted-foreground">
                Le couple partenaire / produit est immuable en édition.
              </p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold">Niveau maximal du réseau</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Le niveau réellement appliqué dépend de la chaîne de la vente,
                jamais du seul niveau maximal choisi ici.
              </p>
            </div>
            {network.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Analyse du réseau…
              </p>
            ) : network.error ? (
              <p className="text-sm text-destructive">
                Impossible d'analyser le réseau de ce partenaire.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {([1, 2, 3] as CommissionLevel[]).map((level) => {
                  const reason =
                    level === 2
                      ? level2Reason
                      : level === 3
                        ? level3Reason
                        : null
                  return (
                    <button
                      key={level}
                      type="button"
                      disabled={reason !== null}
                      onClick={() => update('maxLevel', level)}
                      className={`min-h-28 rounded-[12px] border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${draft.maxLevel === level ? 'border-primary bg-primary/5' : 'hover:border-primary/40'}`}
                    >
                      <span className="font-extrabold">Niveau {level}</span>
                      <span className="mt-2 block text-[12px] leading-relaxed text-muted-foreground">
                        {level === 1
                          ? 'Vente self-service : 100 % au partenaire, implicite.'
                          : (reason ??
                            (level === 2
                              ? 'Partenaire + vendeur direct.'
                              : 'Partenaire + agence + vendeur, avec maintien du niveau 2.'))}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {selectedLevelReason && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {selectedLevelReason}
              </p>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            {draft.maxLevel === 1 ? (
              <div className="rounded-[12px] border border-primary/20 bg-primary/5 p-5">
                <p className="font-bold text-primary">
                  100 % au partenaire, implicite
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Aucune part n'est stockée ni envoyée pour le niveau 1.
                </p>
              </div>
            ) : draft.maxLevel === 2 ? (
              <ShareBlock title="Parts niveau 2" total={validation.level2Total}>
                <ShareField
                  id="level2PartnerShare"
                  label="Partenaire (%)"
                  value={draft.level2PartnerShare}
                  onChange={(value) => update('level2PartnerShare', value)}
                  error={
                    submitted ? validation.errors.level2PartnerShare : undefined
                  }
                />
                <ShareField
                  id="level2SellerShare"
                  label="Vendeur direct (%)"
                  value={draft.level2SellerShare}
                  onChange={(value) => update('level2SellerShare', value)}
                  error={
                    submitted ? validation.errors.level2SellerShare : undefined
                  }
                />
              </ShareBlock>
            ) : (
              <>
                <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-[12.5px] leading-relaxed text-blue-950">
                  Le taux négocié crée un seul pot. Les blocs ci-dessous
                  indiquent comment ce pot est réparti selon la chaîne réelle de
                  la vente. Le barème N2 reste obligatoire dans un schéma N3,
                  même si le partenaire n'a aucun vendeur direct aujourd'hui.
                </div>
                <ShareBlock
                  title="Répartition principale niveau 3"
                  total={validation.level3Total}
                >
                  <ShareField
                    id="level3PartnerShare"
                    label="Partenaire (%)"
                    value={draft.level3PartnerShare}
                    onChange={(value) => update('level3PartnerShare', value)}
                    error={
                      submitted
                        ? validation.errors.level3PartnerShare
                        : undefined
                    }
                  />
                  <ShareField
                    id="level3AgencyShare"
                    label="Agence (%)"
                    value={draft.level3AgencyShare}
                    onChange={(value) => update('level3AgencyShare', value)}
                    error={
                      submitted
                        ? validation.errors.level3AgencyShare
                        : undefined
                    }
                  />
                  <ShareField
                    id="level3SellerShare"
                    label="Vendeur d'agence (%)"
                    value={draft.level3SellerShare}
                    onChange={(value) => update('level3SellerShare', value)}
                    error={
                      submitted
                        ? validation.errors.level3SellerShare
                        : undefined
                    }
                  />
                </ShareBlock>
                <ShareBlock
                  title="Barème de compatibilité niveau 2 (obligatoire)"
                  total={validation.level2Total}
                  description="Utilisé pour toute vente d'un vendeur directement rattaché au partenaire, présent aujourd'hui ou ajouté ultérieurement."
                >
                  <ShareField
                    id="level2PartnerShare"
                    label="Partenaire (%)"
                    value={draft.level2PartnerShare}
                    onChange={(value) => update('level2PartnerShare', value)}
                    error={
                      submitted
                        ? validation.errors.level2PartnerShare
                        : undefined
                    }
                  />
                  <ShareField
                    id="level2SellerShare"
                    label="Vendeur direct (%)"
                    value={draft.level2SellerShare}
                    onChange={(value) => update('level2SellerShare', value)}
                    error={
                      submitted
                        ? validation.errors.level2SellerShare
                        : undefined
                    }
                  />
                </ShareBlock>
              </>
            )}
          </div>
        )}
        {serverError && (
          <div
            role="alert"
            className="mt-5 rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive"
          >
            {serverError}
            {existingId !== null && (
              <Button
                asChild
                variant="link"
                className="ml-2 h-auto p-0 text-destructive underline"
              >
                <Link
                  to="/commissions/schemes/$schemeId/edit"
                  params={{ schemeId: String(existingId) }}
                >
                  Ouvrir le schéma existant
                </Link>
              </Button>
            )}
          </div>
        )}
        <div className="mt-7 flex items-center justify-between border-t pt-5">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 1 || mutation.isPending}
            onClick={() => setStep((current) => current - 1)}
          >
            Précédent
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              disabled={
                (step === 1 &&
                  (draft.partnerId === null ||
                    draft.productId === null ||
                    validation.errors.commissionRate !== undefined)) ||
                (step === 2 &&
                  (network.isLoading ||
                    network.error !== null ||
                    selectedLevelReason !== null))
              }
              onClick={() => setStep((current) => current + 1)}
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                !validation.valid ||
                selectedLevelReason !== null ||
                mutation.isPending
              }
              onClick={submit}
            >
              <Check />
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le schéma'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function ShareBlock({
  title,
  total,
  description,
  children,
}: {
  title: string
  total: number | null
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[12px] border p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[12px] font-bold tabular-nums ${total === 10_000 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}
        >
          {formatShareTotal(total)}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </section>
  )
}

function ShareField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <FormField
      id={id}
      label={label}
      required
      type="text"
      value={value}
      onChange={onChange}
      error={error}
      hint="0,00 à 100,00"
    />
  )
}
