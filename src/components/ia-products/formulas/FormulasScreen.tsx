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
  DataTableHead,
  FIRST_CELL_CLASS,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { TruncatedText } from '#/components/layout/TruncatedText'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Switch } from '#/components/ia-products/shared/Switch'
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
      <Toolbar
        actions={
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
        }
      />
      <ResultCount>
        {isLoading
          ? 'Chargement…'
          : `${formulas.length} formule${formulas.length > 1 ? 's' : ''} · ${activeCount} active${activeCount > 1 ? 's' : ''} · ${formulas.length - activeCount} inactive${formulas.length - activeCount > 1 ? 's' : ''}`}
      </ResultCount>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first className="w-16">
                Ordre
              </DataTableHead>
              <DataTableHead>Libellé</DataTableHead>
              <DataTableHead>Statut</DataTableHead>
              <DataTableHead>Garanties</DataTableHead>
              <DataTableHead>Primes</DataTableHead>
              <DataTableHead className="w-16 pr-[22px] text-right">
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
                const active = f.status === 'ACTIVE'
                return (
                  <TableRow key={f.id} className="hover:bg-[#f6f8fc]">
                    <TableCell className={cn(FIRST_CELL_CLASS, 'tabular-nums')}>
                      {f.displayOrder ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px] font-semibold">
                      <TruncatedText lines={2}>{f.label}</TruncatedText>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span title={canWrite ? undefined : NO_WRITE}>
                          <Switch
                            checked={active}
                            disabled={!canWrite || toggle.isPending}
                            aria-label={`${active ? 'Désactiver' : 'Activer'} la formule ${f.label}`}
                            onCheckedChange={(next) => {
                              if (next)
                                toggle.mutate({ id: f.id, activate: true })
                              else setToDeactivate(f)
                            }}
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
                    </TableCell>
                    <TableCell className="min-w-[250px]">
                      <Amounts
                        lines={[
                          ['Décès', f.deathCapital],
                          ['Invalidité perm.', f.permanentDisabilityCapital],
                          ['Frais médicaux', f.medicalExpenses],
                          ['Indemnité jour.', f.dailyAllowance],
                        ]}
                      />
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      <Amounts
                        lines={[
                          ['Nette', f.netPremium],
                          ['Frais accessoires', f.fees],
                          ['Taxe', f.tax],
                          ['TTC', f.grossPremium],
                        ]}
                      />
                    </TableCell>
                    <TableCell className="pr-[22px] text-right">
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
                    </TableCell>
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
