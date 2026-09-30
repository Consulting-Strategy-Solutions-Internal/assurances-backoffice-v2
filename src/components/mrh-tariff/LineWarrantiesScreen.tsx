import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, ShieldCheck } from 'lucide-react'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { StatusPill } from '#/components/dashboard/StatusPill'
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  TableEmptyState,
  TableErrorState,
  TableSkeletonRows,
} from '#/components/layout/DataTable'
import { SegmentedPills } from '#/components/layout/SegmentedPills'
import { ResultCount, Toolbar } from '#/components/layout/Toolbar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  RetryAction,
  isForbidden,
  noWriteTitle,
} from '#/components/ia-products/shared/screen-kit'
import { formatPercent, formatPermille } from '#/lib/format'
import { PREMIUM_TYPE_LABELS } from '#/lib/mrh-tariff'
import { formatFcfa } from '#/lib/utils'
import {
  MRH_WARRANTY_CODES,
  getLegalQualities,
  getLegalQualityWarranties,
  getWarranties,
} from '#/services/mrh-tariff'
import type {
  LegalQualityWarrantyResponse,
  MrhLegalQualityCode,
} from '#/services/mrh-tariff'
import { CodeTag, MRH_KEYS } from './grid-kit'
import { sortByGridOrder } from './LegalQualitiesScreen'
import { LineWarrantyDialog } from './LineWarrantyDialog'

/** Valeur de la ligne selon son mode (« 25 % de la prime de base »…). */
export function describeLineValue(line: LegalQualityWarrantyResponse): string {
  switch (line.premiumType) {
    case 'POURCENTAGE':
      return `${formatPercent(line.rate)} de la prime de base`
    case 'FORFAIT':
      return formatFcfa(line.flatAmount)
    case 'CAPITAL':
      return `${formatPermille(line.rate)} sur ${formatPercent(line.capitalShare)} des capitaux`
  }
}

export function LineWarrantiesScreen({
  situation,
  onSituationChange,
}: {
  situation: MrhLegalQualityCode | undefined
  onSituationChange: (code: MrhLegalQualityCode) => void
}) {
  const { can } = usePermissions()
  const canWrite = can('legalquality:write')
  const [editingId, setEditingId] = useState<number | null>(null)

  const situations = useQuery({
    queryKey: MRH_KEYS.legalQualities,
    queryFn: getLegalQualities,
  })
  const warranties = useQuery({
    queryKey: MRH_KEYS.warranties,
    queryFn: getWarranties,
  })
  const lines = useQuery({
    queryKey: MRH_KEYS.lines,
    queryFn: getLegalQualityWarranties,
  })

  const situationList = useMemo(
    () => sortByGridOrder(situations.data?.content ?? []),
    [situations.data],
  )
  const current =
    situationList.find((s) => s.code === situation) ?? situationList.at(0)
  const warrantyById = useMemo(
    () => new Map((warranties.data?.content ?? []).map((w) => [w.id, w])),
    [warranties.data],
  )
  const rows = useMemo(() => {
    const rank = (line: LegalQualityWarrantyResponse) => {
      const code = warrantyById.get(line.warrantyId)?.code
      return code ? MRH_WARRANTY_CODES.indexOf(code) : Number.MAX_SAFE_INTEGER
    }
    return (lines.data?.content ?? [])
      .filter((l) => l.legalQualityId === current?.id)
      .sort((a, b) => rank(a) - rank(b) || a.id - b.id)
  }, [lines.data, current, warrantyById])
  const editing = rows.find((l) => l.id === editingId) ?? null

  const isPending = situations.isPending || lines.isPending
  const failed = situations.isError
    ? situations
    : lines.isError
      ? lines
      : warranties.isError
        ? warranties
        : null
  const mandatoryCount = rows.filter((l) => l.mandatory).length

  return (
    <div>
      {situationList.length > 0 && (
        <Toolbar
          filters={
            <SegmentedPills
              label="Situation"
              scrollable
              value={current?.code ?? situationList[0].code}
              options={situationList.map((s) => ({
                value: s.code,
                label: s.name,
              }))}
              onChange={onSituationChange}
            />
          }
        />
      )}
      <ResultCount>
        {isPending
          ? 'Chargement…'
          : `${rows.length} garantie${rows.length > 1 ? 's' : ''} proposée${rows.length > 1 ? 's' : ''} · ${mandatoryCount} obligatoire${mandatoryCount > 1 ? 's' : ''}`}
      </ResultCount>
      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <DataTableHead first>Garantie</DataTableHead>
              <DataTableHead hideBelow="md">Mode</DataTableHead>
              <DataTableHead>Tarif</DataTableHead>
              <DataTableHead hideBelow="sm">Obligatoire</DataTableHead>
              <DataTableHead className="pr-[22px] text-right">
                Actions
              </DataTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableSkeletonRows
                rows={6}
                columns={[40, 16, 28, 12, 10]}
                hideBelow={[undefined, 'md', undefined, 'sm', undefined]}
              />
            ) : failed ? (
              <TableErrorState
                colSpan={5}
                forbidden={isForbidden(failed.error)}
                title="Impossible de charger la grille."
                action={<RetryAction onRetry={() => void failed.refetch()} />}
              />
            ) : rows.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                icon={ShieldCheck}
                title="Aucune garantie proposée dans cette situation."
              />
            ) : (
              rows.map((line) => {
                const warranty = warrantyById.get(line.warrantyId)
                const name = warranty?.name ?? `Garantie #${line.warrantyId}`
                return (
                  <TableRow key={line.id} className="hover:bg-[#f6f8fc]">
                    <DataTableCell first>
                      <div className="text-[13.5px] font-semibold break-words">
                        {name}
                      </div>
                      {warranty && (
                        <div className="mt-0.5">
                          <CodeTag>{warranty.code}</CodeTag>
                        </div>
                      )}
                    </DataTableCell>
                    <DataTableCell hideBelow="md">
                      <StatusPill tone="neutral">
                        {PREMIUM_TYPE_LABELS[line.premiumType]}
                      </StatusPill>
                    </DataTableCell>
                    <TableCell className="text-[13.5px] tabular-nums">
                      {describeLineValue(line)}
                    </TableCell>
                    <DataTableCell hideBelow="sm">
                      {line.mandatory ? (
                        <StatusPill tone="info">Obligatoire</StatusPill>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">
                          Optionnelle
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="pr-[22px] text-right">
                      <span
                        title={noWriteTitle('Qualités juridiques', canWrite)}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Modifier ${name}`}
                          disabled={!canWrite}
                          onClick={() => setEditingId(line.id)}
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
      {editing && current && (
        <LineWarrantyDialog
          line={editing}
          legalQuality={current}
          warranty={warrantyById.get(editing.warrantyId)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
