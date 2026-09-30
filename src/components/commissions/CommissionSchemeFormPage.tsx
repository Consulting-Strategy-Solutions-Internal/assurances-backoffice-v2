import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '#/components/forms/FormField'
import { useUnsavedChangesGuard } from '#/components/forms/unsaved-changes'
import { Label } from '#/components/ui/label'
import { SearchableSelect } from '#/components/layout/SearchableSelect'
import { Button } from '#/components/ui/button'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { BackLink } from '#/components/layout/BackLink'
import { EmptyState } from '#/components/layout/EmptyState'
import { SectionCard } from '#/components/layout/SectionCard'
import { Card } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { mapClaimError } from '#/lib/claims'
import { cn } from '#/lib/utils'
import { parseSchemeError } from '#/lib/commission-scheme-errors'
import { ShareSplitter } from './ShareSplitter'
import type { ProductCode } from '#/services/products'
import {
  formatShareTotal,
  percentToCents,
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
  product: null,
  commissionRate: '',
  maxLevel: 1,
  level2PartnerShare: '',
  level2SellerShare: '',
  level3PartnerShare: '',
  level3AgencyShare: '',
  level3SellerShare: '',
}

type ShareBlockId = 'level2' | 'level3'

/** A block loaded from an existing scheme, already at 100 %, counts as confirmed. */
function loadedBlockConfirmed(values: string[]): boolean {
  const cents = values.map(percentToCents)
  return (
    cents.every((c): c is number => c !== null) &&
    cents.reduce((sum, c) => sum + c, 0) === 10_000
  )
}

function initialDraft(
  scheme: Awaited<ReturnType<typeof getCommissionScheme>>,
): CommissionSchemeDraft {
  const value = (rate: number | null) => (rate === null ? '' : String(rate))
  return {
    partnerId: scheme.partnerId,
    product: scheme.product,
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
  // Field errors returned by the backend, shown under the fields until edited.
  const [serverFields, setServerFields] = useState<
    Partial<Record<keyof CommissionSchemeDraft, string>>
  >({})
  const fieldError = (field: keyof CommissionSchemeDraft) =>
    (submitted ? validation.errors[field] : undefined) ?? serverFields[field]
  // Blocks whose split the administrator has confirmed (moved a thumb, clicked
  // « Confirmer », or loaded from an existing scheme). A pre-filled default
  // split is not saveable until confirmed (R1-13).
  const [confirmedBlocks, setConfirmedBlocks] = useState<
    Record<ShareBlockId, boolean>
  >({ level2: false, level3: false })
  const setBlockConfirmed = (block: ShareBlockId) => (value: boolean) =>
    setConfirmedBlocks((current) =>
      current[block] === value ? current : { ...current, [block]: value },
    )
  const [existingId, setExistingId] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
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
    if (!schemeQuery.data) return
    const loaded = initialDraft(schemeQuery.data)
    setDraft(loaded)
    setConfirmedBlocks({
      level2: loadedBlockConfirmed([
        loaded.level2PartnerShare,
        loaded.level2SellerShare,
      ]),
      level3: loadedBlockConfirmed([
        loaded.level3PartnerShare,
        loaded.level3AgencyShare,
        loaded.level3SellerShare,
      ]),
    })
  }, [schemeQuery.data])

  const baseline = useMemo(
    () => (schemeQuery.data ? initialDraft(schemeQuery.data) : EMPTY_DRAFT),
    [schemeQuery.data],
  )
  const dirty =
    !saved &&
    (Object.keys(baseline) as Array<keyof CommissionSchemeDraft>).some(
      (key) => draft[key] !== baseline[key],
    )
  const { dialog: unsavedDialog } = useUnsavedChangesGuard(dirty)

  const validation = useMemo(
    () =>
      validateCommissionScheme(
        draft,
        schemeQuery.data
          ? {
              partnerId: schemeQuery.data.partnerId,
              product: schemeQuery.data.product,
            }
          : undefined,
      ),
    [draft, schemeQuery.data],
  )
  const unconfirmedBlocks: string[] =
    draft.maxLevel === 1
      ? []
      : [
          ...(confirmedBlocks.level2
            ? []
            : [
                draft.maxLevel === 3
                  ? 'le barème de compatibilité niveau 2'
                  : 'les parts du niveau 2',
              ]),
          ...(draft.maxLevel === 3 && !confirmedBlocks.level3
            ? ['la répartition principale niveau 3']
            : []),
        ]
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
      // The unsaved-changes guard is lifted first; the effect below navigates.
      setSaved(true)
    },
  })
  useEffect(() => {
    if (saved) void navigate({ to: '/commissions/schemes' })
  }, [saved, navigate])

  const submit = async () => {
    setSubmitted(true)
    setExistingId(null)
    setServerError(null)
    setServerFields({})
    if (!validation.payload || selectedLevelReason) return
    if (unconfirmedBlocks.length > 0) return
    try {
      await mutation.mutateAsync(validation.payload)
    } catch (error) {
      if (
        !editing &&
        isAxiosError(error) &&
        error.response?.status === 409 &&
        draft.partnerId !== null &&
        draft.product !== null
      ) {
        try {
          const existing = await getCommissionSchemes({
            partnerId: draft.partnerId,
            product: draft.product,
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
        toast.error('Ce schéma existe déjà', {
          description:
            'Un schéma actif existe déjà pour ce couple partenaire / produit : modifiez-le plutôt que d’en créer un second.',
        })
      } else {
        const parsed = parseSchemeError(error)
        setServerFields(parsed.fields)
        setServerError(parsed.details.join(' '))
        const target = parsed.step
        toast.error(parsed.title, {
          description: (
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {parsed.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ),
          duration: 10_000,
          action:
            target !== null && target !== step
              ? {
                  label: `Corriger (étape ${target})`,
                  onClick: () => setStep(target),
                }
              : undefined,
        })
      }
    }
  }
  const update = <TField extends keyof CommissionSchemeDraft>(
    field: TField,
    value: CommissionSchemeDraft[TField],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setServerFields((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  if ((editing && schemeQuery.isLoading) || references.isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-[18px]">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }
  if (
    (editing && (schemeQuery.error || !schemeQuery.data)) ||
    references.error
  ) {
    const loadError = editing
      ? (schemeQuery.error ?? references.error)
      : references.error
    const forbidden =
      loadError !== null && mapClaimError(loadError).kind === 'forbidden'
    const notFound =
      !forbidden &&
      editing &&
      schemeQuery.error !== null &&
      isAxiosError(schemeQuery.error) &&
      schemeQuery.error.response?.status === 404
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-[18px]">
        <BackLink to="/commissions/schemes">Retour aux schémas</BackLink>
        <EmptyState
          variant="card"
          icon={TriangleAlert}
          tone="error"
          title={
            forbidden
              ? 'Accès refusé.'
              : notFound
                ? 'Schéma introuvable.'
                : 'Le serveur n’a pas pu charger le formulaire.'
          }
          description={
            forbidden
              ? 'Vous n’avez pas les droits nécessaires pour consulter ces données.'
              : notFound
                ? 'Ce schéma n’existe plus : il a peut-être été supprimé. Retournez à la liste pour choisir un autre schéma.'
                : 'Vérifiez votre connexion, puis réessayez. Si le problème persiste, contactez l’équipe technique.'
          }
          action={
            forbidden || notFound ? undefined : (
              <Button
                type="button"
                variant="outline"
                className="rounded-[11px]"
                onClick={() => {
                  void schemeQuery.refetch()
                  void references.refetch()
                }}
              >
                Réessayer
              </Button>
            )
          }
        />
      </div>
    )
  }

  const continueBlocked =
    (step === 1 &&
      (draft.partnerId === null ||
        draft.product === null ||
        validation.errors.commissionRate !== undefined)) ||
    (step === 2 &&
      (network.isLoading ||
        network.error !== null ||
        selectedLevelReason !== null))
  const blockReason: string | undefined =
    step === 1
      ? draft.partnerId === null
        ? 'Choisissez un partenaire pour continuer.'
        : draft.product === null
          ? 'Choisissez un produit pour continuer.'
          : validation.errors.commissionRate !== undefined
            ? 'Saisissez un taux de commission valide pour continuer.'
            : undefined
      : step === 2
        ? network.isLoading
          ? 'Analyse du réseau du partenaire en cours…'
          : network.error !== null
            ? 'Le réseau du partenaire n’a pas pu être analysé : rechargez la page.'
            : (selectedLevelReason ?? undefined)
        : !validation.valid
          ? 'Complétez les pourcentages : chaque bloc doit totaliser 100 %.'
          : unconfirmedBlocks.length > 0
            ? `Confirmez ${unconfirmedBlocks.join(' et ')} (répartition par défaut) : déplacez un curseur ou cliquez sur « Confirmer cette répartition ».`
            : undefined

  const steps = ['Couple', 'Niveau', 'Répartition']

  return (
    <div className="mx-auto max-w-4xl">
      {unsavedDialog}
      <BackLink to="/commissions/schemes">Retour aux schémas</BackLink>
      <div className="mt-3">
        <PageHeader
          title={editing ? 'Modifier le schéma' : 'Nouveau schéma'}
          subtitle={
            editing
              ? 'Le taux modifié ne vaut que pour les nouveaux contrats. Les parts modifiées s’appliquent aux encaissements pas encore distribués, y compris ceux rejoués ; aucune distribution historique n’est réécrite.'
              : 'Définissez le taux négocié et la répartition de la commission pour un partenaire et un produit, en trois étapes. Le schéma s’appliquera aux nouveaux contrats de ce couple.'
          }
        />
      </div>
      <ol className="mb-[18px] grid grid-cols-3 gap-2">
        {steps.map((label, index) => {
          const current = step === index + 1
          const done = step > index + 1
          return (
            <li
              key={label}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold',
                current
                  ? 'border-primary bg-primary/5 text-primary'
                  : done
                    ? 'border-[#1c8a57]/30 bg-[#e7f6ee] text-[#167347]'
                    : 'bg-card text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  current
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-[#1c8a57] text-white'
                      : 'bg-[#f0f1f4]',
                )}
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
      <div className="flex flex-col gap-[18px]">
        {step === 1 && (
          <>
            <SectionCard
              title="Partenaire et produit"
              description={
                editing
                  ? 'Le couple partenaire / produit est immuable en édition.'
                  : 'Un seul schéma actif est possible par couple partenaire / produit.'
              }
            >
              <div className="grid gap-5 md:grid-cols-2">
                <SchemeSelect
                  id="scheme-partner"
                  label="Partenaire"
                  value={
                    draft.partnerId === null ? '' : String(draft.partnerId)
                  }
                  disabled={editing}
                  placeholder="Sélectionner un partenaire"
                  searchPlaceholder="Rechercher un partenaire…"
                  options={(references.data?.partners ?? []).map((item) => ({
                    value: String(item.id),
                    label: item.name,
                    hint: item.distributorCode,
                  }))}
                  onChange={(value) =>
                    update('partnerId', value ? Number(value) : null)
                  }
                  error={fieldError('partnerId')}
                />
                <SchemeSelect
                  id="scheme-product"
                  label="Produit"
                  value={draft.product ?? ''}
                  disabled={editing}
                  placeholder="Sélectionner un produit"
                  searchPlaceholder="Rechercher un produit…"
                  options={(references.data?.products ?? []).map((item) => ({
                    value: item.code,
                    label: item.label,
                  }))}
                  onChange={(value) =>
                    update('product', value ? (value as ProductCode) : null)
                  }
                  error={fieldError('product')}
                />
              </div>
            </SectionCard>
            <SectionCard
              title="Taux de commission"
              description="Ce taux est gelé sur chaque contrat à la souscription : une modification ne change jamais les contrats déjà souscrits, même lors d’un rejeu."
            >
              <div className="max-w-sm">
                <FormField
                  id="scheme-commission-rate"
                  label="Taux de commission négocié (%)"
                  required
                  type="text"
                  value={draft.commissionRate}
                  onChange={(value) => update('commissionRate', value)}
                  error={
                    (draft.commissionRate !== '' || submitted
                      ? validation.errors.commissionRate
                      : undefined) ?? serverFields.commissionRate
                  }
                  hint="Pourcentage de la prime nette constituant le pot à répartir pour ce partenaire et ce produit. 0 % signifie que les encaissements seront ignorés."
                />
              </div>
            </SectionCard>
          </>
        )}
        {step === 2 && (
          <SectionCard
            title="Niveau maximal du réseau"
            description="Le niveau réellement appliqué dépend de la chaîne de la vente, jamais du seul niveau maximal choisi ici."
          >
            <div className="space-y-4">
              {network.isLoading ? (
                <Skeleton className="h-28 rounded-xl" />
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
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {selectedLevelReason}
                </p>
              )}
            </div>
          </SectionCard>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-[18px]">
            {draft.maxLevel === 1 ? (
              <SectionCard
                title="100 % au partenaire, implicite"
                description="Aucune part n’est stockée ni envoyée pour le niveau 1."
              />
            ) : draft.maxLevel === 2 ? (
              <ShareBlock
                title="Parts niveau 2"
                total={validation.level2Total}
                unconfirmed={!confirmedBlocks.level2}
              >
                <ShareSplitter
                  label="Répartition niveau 2"
                  confirmed={confirmedBlocks.level2}
                  onConfirmedChange={setBlockConfirmed('level2')}
                  parts={[
                    {
                      id: 'level2PartnerShare',
                      label: 'Partenaire',
                      value: draft.level2PartnerShare,
                      onChange: (value) => update('level2PartnerShare', value),
                      error: fieldError('level2PartnerShare'),
                    },
                    {
                      id: 'level2SellerShare',
                      label: 'Vendeur direct',
                      value: draft.level2SellerShare,
                      onChange: (value) => update('level2SellerShare', value),
                      error: fieldError('level2SellerShare'),
                    },
                  ]}
                />
              </ShareBlock>
            ) : (
              <>
                <div className="rounded-lg bg-[#e7eefb] px-4 py-3 text-[13px] leading-relaxed text-[#1f53b0]">
                  Le taux négocié crée un seul pot. Les blocs ci-dessous
                  indiquent comment ce pot est réparti selon la chaîne réelle de
                  la vente. Le barème N2 reste obligatoire dans un schéma N3,
                  même si le partenaire n'a aucun vendeur direct aujourd'hui.
                </div>
                <ShareBlock
                  title="Répartition principale niveau 3"
                  total={validation.level3Total}
                  unconfirmed={!confirmedBlocks.level3}
                >
                  <ShareSplitter
                    label="Répartition principale niveau 3"
                    confirmed={confirmedBlocks.level3}
                    onConfirmedChange={setBlockConfirmed('level3')}
                    parts={[
                      {
                        id: 'level3PartnerShare',
                        label: 'Partenaire',
                        value: draft.level3PartnerShare,
                        onChange: (value) =>
                          update('level3PartnerShare', value),
                        error: fieldError('level3PartnerShare'),
                      },
                      {
                        id: 'level3AgencyShare',
                        label: 'Agence',
                        value: draft.level3AgencyShare,
                        onChange: (value) => update('level3AgencyShare', value),
                        error: fieldError('level3AgencyShare'),
                      },
                      {
                        id: 'level3SellerShare',
                        label: "Vendeur d'agence",
                        value: draft.level3SellerShare,
                        onChange: (value) => update('level3SellerShare', value),
                        error: fieldError('level3SellerShare'),
                      },
                    ]}
                  />
                </ShareBlock>
                <ShareBlock
                  title="Barème de compatibilité niveau 2 (obligatoire)"
                  total={validation.level2Total}
                  unconfirmed={!confirmedBlocks.level2}
                  description="Utilisé pour toute vente d'un vendeur directement rattaché au partenaire, présent aujourd'hui ou ajouté ultérieurement."
                >
                  <ShareSplitter
                    label="Barème de compatibilité niveau 2"
                    confirmed={confirmedBlocks.level2}
                    onConfirmedChange={setBlockConfirmed('level2')}
                    parts={[
                      {
                        id: 'level2PartnerShare',
                        label: 'Partenaire',
                        value: draft.level2PartnerShare,
                        onChange: (value) =>
                          update('level2PartnerShare', value),
                        error: fieldError('level2PartnerShare'),
                      },
                      {
                        id: 'level2SellerShare',
                        label: 'Vendeur direct',
                        value: draft.level2SellerShare,
                        onChange: (value) => update('level2SellerShare', value),
                        error: fieldError('level2SellerShare'),
                      },
                    ]}
                  />
                </ShareBlock>
              </>
            )}
          </div>
        )}
        {serverError && (
          <div
            role="alert"
            className="rounded-lg bg-[#fbe9e9] px-4 py-3 text-sm text-[#c0392b]"
          >
            {serverError}
            {existingId !== null && (
              <Button
                asChild
                variant="link"
                className="ml-2 h-auto p-0 text-[#c0392b] underline"
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
        <Card className="flex-row flex-wrap items-center justify-between gap-3 p-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-[11px]"
            disabled={step === 1 || mutation.isPending}
            title={step === 1 ? 'Vous êtes à la première étape.' : undefined}
            onClick={() => setStep((current) => current - 1)}
          >
            Précédent
          </Button>
          {blockReason && (
            <p
              role="status"
              className="min-w-0 flex-1 text-right text-[12.5px] text-muted-foreground"
            >
              {blockReason}
            </p>
          )}
          {step < 3 ? (
            <Button
              type="button"
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              disabled={continueBlocked}
              title={continueBlocked ? blockReason : undefined}
              onClick={() => setStep((current) => current + 1)}
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              disabled={
                !validation.valid ||
                unconfirmedBlocks.length > 0 ||
                selectedLevelReason !== null ||
                mutation.isPending
              }
              title={blockReason}
              onClick={submit}
            >
              <Check />
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le schéma'}
            </Button>
          )}
        </Card>
      </div>
    </div>
  )
}

function SchemeSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder,
  searchPlaceholder,
  error,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string; hint?: string }>
  onChange: (value: string) => void
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px]">
        {label}
        <span className="text-destructive">*</span>
      </Label>
      <SearchableSelect
        id={id}
        label={label}
        value={value}
        allLabel={placeholder}
        placeholder={searchPlaceholder}
        options={options}
        onChange={onChange}
        disabled={disabled}
        disabledHint={
          disabled
            ? 'Le couple partenaire / produit ne peut pas être modifié : supprimez le schéma puis recréez-le.'
            : undefined
        }
        className="w-full"
      />
      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function ShareBlock({
  title,
  total,
  unconfirmed,
  description,
  children,
}: {
  title: string
  total: number | null
  /** The block only shows the pre-filled default split. */
  unconfirmed?: boolean
  description?: string
  children: React.ReactNode
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={
        <span
          className={cn(
            'rounded-full px-3 py-1 text-[12px] font-bold tabular-nums',
            total === 10_000 && !unconfirmed
              ? 'bg-[#e7f6ee] text-[#167347]'
              : 'bg-[#fef3da] text-[#8a6600]',
          )}
        >
          {unconfirmed
            ? 'Répartition par défaut — à confirmer'
            : formatShareTotal(total)}
        </span>
      }
    >
      {children}
    </SectionCard>
  )
}
