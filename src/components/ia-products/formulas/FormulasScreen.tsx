import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  activateFormula,
  deactivateFormula,
  getFormulas,
} from '#/services/ia-for-all'
import type { FormulaResponse } from '#/services/ia-for-all'
import { parseIaErrorList } from '#/lib/ia-errors'
import { cn, formatFcfa } from '#/lib/utils'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { MobileCardList } from '#/components/layout/MobileCardList'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { ResultCount } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Switch } from '#/components/ia-products/shared/Switch'
import { HeaderActionPortal } from '../shared/header-action'
import { isForbidden, RetryAction } from '../shared/screen-kit'
import { FormulaDialog } from './FormulaDialog'
import type { FormulaFormValues } from './formula-logic'

type DialogState =
  | { kind: 'create'; initialValues?: FormulaFormValues; key: number }
  | { kind: 'edit'; formula: FormulaResponse; key: number }

const NO_WRITE = 'Vous n’avez pas la permission de modifier les formules.'

function Amounts({ lines }: { lines: [string, number][] }) {
  return (
    <div className="flex flex-col gap-0.5 text-[12.5px]">
      {lines.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">{formatFcfa(value)}</span>
        </div>
      ))}
    </div>
  )
}

function FormulaStatusSwitch({
  formula,
  canWrite,
  pending,
  onActivate,
  onDeactivate,
}: {
  formula: FormulaResponse
  canWrite: boolean
  pending: boolean
  onActivate: () => void
  onDeactivate: () => void
}) {
  const active = formula.status === 'ACTIVE'
  return (
    <div className="flex items-center gap-2.5">
      <span title={canWrite ? undefined : NO_WRITE}>
        <Switch
          checked={active}
          disabled={!canWrite || pending}
          aria-label={`${active ? 'Désactiver' : 'Activer'} la formule ${formula.label}`}
          onCheckedChange={(next) => (next ? onActivate() : onDeactivate())}
        />
      </span>
      <span
        className={cn(
          'text-[13px] font-semibold',
          active ? 'text-[#167347]' : 'text-muted-foreground',
        )}
      >
        {active ? 'Active' : 'Inactive'}
      </span>
    </div>
  )
}

function guaranteeLines(f: FormulaResponse): [string, number][] {
  return [
    ['Décès', f.deathCapital],
    ['Invalidité perm.', f.permanentDisabilityCapital],
    ['Frais médicaux', f.medicalExpenses],
    ['Indemnité jour.', f.dailyAllowance],
  ]
}

function premiumLines(f: FormulaResponse): [string, number][] {
  return [
    ['Nette', f.netPremium],
    ['Frais accessoires', f.fees],
    ['Taxe', f.tax],
    ['TTC', f.grossPremium],
  ]
}

export function FormulasScreen() {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('product:write')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toDeactivate, setToDeactivate] = useState<FormulaResponse | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ia-for-all', 'formulas', 'list'],
    queryFn: getFormulas,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ia-for-all', 'formulas'] })

  const toggle = useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      activate ? activateFormula(id) : deactivateFormula(id),
    onSuccess: (_res, { activate }) => {
      void invalidate()
      toast.success(activate ? 'Formule activée.' : 'Formule désactivée.')
      setToDeactivate(null)
    },
    onError: (err) => {
      toast.error(parseIaErrorList(err).join(' '))
      setToDeactivate(null)
    },
  })

  const openCreate = (initialValues?: FormulaFormValues) =>
    setDialog({ kind: 'create', initialValues, key: Date.now() })

  const formulas = data ?? []
  const activeCount = formulas.filter((f) => f.status === 'ACTIVE').length

  return (
    <>
      <HeaderActionPortal>
        <span title={canWrite ? undefined : NO_WRITE}>
          <Button
            disabled={!canWrite}
            onClick={() => openCreate()}
            className="rounded-[11px]"
          >
            <Plus className="size-4" />
            Nouvelle formule
          </Button>
        </span>
      </HeaderActionPortal>
      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : `${formulas.length} formule${formulas.length > 1 ? 's' : ''} · ${activeCount} active${activeCount > 1 ? 's' : ''} · ${formulas.length - activeCount} inactive${formulas.length - activeCount > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard
        mobileCards={
          <MobileCardList
            items={formulas}
            getKey={(f) => f.id}
            isLoading={isLoading}
            skeletonCount={3}
            error={isError}
            forbidden={isForbidden(error)}
            errorTitle="Impossible de charger les formules."
            errorAction={<RetryAction onRetry={() => void refetch()} />}
            empty={{
              icon: Package,
              title: 'Aucune formule pour le moment.',
              action: canWrite ? (
                <Button className="rounded-[11px]" onClick={() => openCreate()}>
                  <Plus className="size-4" />
                  Nouvelle formule
                </Button>
              ) : undefined,
            }}
            renderCard={(f) => (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">
                      <TruncatedText lines={2}>{f.label}</TruncatedText>
                    </p>
                    {f.displayOrder != null && (
                      <p className="text-[12px] text-muted-foreground">
                        Ordre {f.displayOrder}
                      </p>
                    )}
                  </div>
                  <span title={canWrite ? undefined : NO_WRITE}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-9"
                      disabled={!canWrite}
                      aria-label={`Modifier la formule ${f.label}`}
                      onClick={() =>
                        setDialog({ kind: 'edit', formula: f, key: f.id })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </span>
                </div>
                <FormulaStatusSwitch
                  formula={f}
                  canWrite={canWrite}
                  pending={toggle.isPending}
                  onActivate={() => toggle.mutate({ id: f.id, activate: true })}
                  onDeactivate={() => setToDeactivate(f)}
                />
                <div className="grid gap-3 rounded-lg bg-muted/40 p-3">
                  <div>
                    <p className="mb-1 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                      Garanties
                    </p>
                    <Amounts lines={guaranteeLines(f)} />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                      Primes
                    </p>
                    <Amounts lines={premiumLines(f)} />
                  </div>
                </div>
              </div>
            )}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first sticky="left" className="w-16">
                Ordre
              </DataTableHead>
              <DataTableHead>Libellé</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead>Garanties</DataTableHead>
              <DataTableHead>Primes</DataTableHead>
              <DataTableHead
                sticky="right"
                className="w-16 pr-[22px] text-right"
              >
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows rows={4} columns={[8, 36, 24, 56, 52, 8]} />
            ) : isError ? (
              <TableErrorState
                colSpan={6}
                forbidden={isForbidden(error)}
                title="Impossible de charger les formules."
                action={<RetryAction onRetry={() => void refetch()} />}
              />
            ) : formulas.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                icon={Package}
                title="Aucune formule pour le moment."
                action={
                  canWrite ? (
                    <Button
                      className="rounded-[11px]"
                      onClick={() => openCreate()}
                    >
                      <Plus className="size-4" />
                      Nouvelle formule
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              formulas.map((f) => {
                return (
                  <TableRow key={f.id} className="hover:bg-[#f6f8fc]">
                    <DataTableCell first sticky="left" className="tabular-nums">
                      {f.displayOrder ?? '—'}
                    </DataTableCell>
                    <TableCell className="max-w-[220px] font-semibold">
                      <TruncatedText lines={2}>{f.label}</TruncatedText>
                    </TableCell>
                    <TableCell>
                      <FormulaStatusSwitch
                        formula={f}
                        canWrite={canWrite}
                        pending={toggle.isPending}
                        onActivate={() =>
                          toggle.mutate({ id: f.id, activate: true })
                        }
                        onDeactivate={() => setToDeactivate(f)}
                      />
                    </TableCell>
                    <TableCell className="md:min-w-[250px]">
                      <Amounts lines={guaranteeLines(f)} />
                    </TableCell>
                    <TableCell className="md:min-w-[260px]">
                      <Amounts lines={premiumLines(f)} />
                    </TableCell>
                    <DataTableCell
                      sticky="right"
                      className="pr-[22px] text-right"
                    >
                      <span title={canWrite ? undefined : NO_WRITE}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canWrite}
                          aria-label={`Modifier la formule ${f.label}`}
                          onClick={() =>
                            setDialog({ kind: 'edit', formula: f, key: f.id })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </span>
                    </DataTableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      {dialog && (
        <FormulaDialog
          key={`${dialog.kind}-${dialog.key}`}
          formula={dialog.kind === 'edit' ? dialog.formula : undefined}
          initialValues={
            dialog.kind === 'create' ? dialog.initialValues : undefined
          }
          onClose={() => setDialog(null)}
          onCopy={(values) => openCreate(values)}
        />
      )}

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null)
        }}
        title="Désactiver cette formule ?"
        description={`« ${toDeactivate?.label ?? ''} » disparaîtra du catalogue client et vendeur. Vous pourrez la réactiver à tout moment.`}
        confirmLabel="Désactiver"
        destructive
        pending={toggle.isPending}
        onConfirm={() => {
          if (toDeactivate)
            toggle.mutate({ id: toDeactivate.id, activate: false })
        }}
      />
    </>
  )
}
