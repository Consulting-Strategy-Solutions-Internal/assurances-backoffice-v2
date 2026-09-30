import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { FormDialog } from '#/components/forms/FormDialog'
import { Button } from '#/components/ui/button'
import { CsvDropZone } from '#/components/ia-products/shared/CsvDropZone'
import { translateBackendMessage } from '#/lib/backend-messages'
import { parseIaError } from '#/lib/ia-errors'
import { importAccessoriesCsv } from '#/services/accessories'
import type { AccessoryImportError } from '#/services/accessories'
import { findIaProduct } from '#/services/products'
import {
  CSV_HEADER,
  buildCsvTemplate,
  formatImportedCount,
  precheckAccessoriesCsv,
} from './accessories-logic'
import type { CsvPrecheck } from './accessories-logic'

function downloadTemplate(productCode: number) {
  const blob = new Blob([buildCsvTemplate(productCode)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modele-accessoires-ia-standard.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function importErrorLabel(err: AccessoryImportError): string {
  return err.line === 0
    ? `Fichier : ${translateBackendMessage(err.message)}`
    : `Ligne ${err.line} : ${translateBackendMessage(err.message)}`
}

interface ImportAccessoriesDialogProps {
  onClose: () => void
}

export function ImportAccessoriesDialog({
  onClose,
}: ImportAccessoriesDialogProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const currentFile = useRef<File | null>(null)
  const [precheck, setPrecheck] = useState<CsvPrecheck | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [rejected, setRejected] = useState<AccessoryImportError[]>([])

  const { data: product, isPending: productLoading } = useQuery({
    queryKey: ['products', 'IA_STANDARD'],
    queryFn: () => findIaProduct('IA_STANDARD'),
  })
  const productCode = product?.productCode

  const { mutateAsync, isPending } = useMutation({
    mutationFn: importAccessoriesCsv,
  })

  const resetFeedback = () => {
    setServerError(null)
    setRejected([])
  }

  const onFileChange = async (selected: File | null) => {
    resetFeedback()
    setReadError(null)
    currentFile.current = selected
    setFile(selected)
    setPrecheck(null)
    if (!selected || productCode === undefined) return
    try {
      const result = precheckAccessoriesCsv(await selected.text(), productCode)
      // Un fichier choisi entre-temps rend ce résultat caduc.
      if (currentFile.current !== selected) return
      setPrecheck(result)
    } catch {
      if (currentFile.current !== selected) return
      setReadError('Impossible de lire ce fichier.')
    }
  }

  const blocked =
    precheck !== null &&
    (precheck.headerError !== null || precheck.badLines.length > 0)

  const submit = async () => {
    resetFeedback()
    if (!file || !precheck || blocked) return
    try {
      const res = await mutateAsync(file)
      if (res.errors.length > 0) {
        setRejected(res.errors)
        return
      }
      queryClient.invalidateQueries({
        queryKey: ['accessories', 'IA_STANDARD'],
      })
      toast.success(formatImportedCount(res.imported))
      onClose()
    } catch (error) {
      setServerError(parseIaError(error).message)
    }
  }

  const dirty = file !== null

  return (
    <FormDialog
      dirty={dirty}
      onClose={onClose}
      eyebrow="Accessoires — IA Standard"
      title="Importer des tranches (CSV)"
      description="Tout ou rien : si une ligne est refusée, rien n’est importé."
      onSubmit={submit}
      submitLabel={isPending ? 'Import…' : 'Importer'}
      pending={isPending}
      submitDisabled={!file || !precheck || blocked}
      error={serverError ?? readError}
    >
      <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
        <p>
          En-tête&nbsp;:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11.5px] text-foreground">
            {CSV_HEADER}
          </code>
        </p>
        <p>
          Séparateur «&nbsp;,&nbsp;» ou «&nbsp;;&nbsp;», décimaux avec virgule
          ou point, lignes vides ignorées.
        </p>
        <p>
          <code className="rounded bg-muted px-1 py-0.5 text-[11.5px] text-foreground">
            productCode
          </code>{' '}
          = code NSIA d’IA Standard&nbsp;:{' '}
          {productLoading ? (
            'chargement…'
          ) : productCode === undefined ? (
            <span className="font-medium text-destructive">
              produit IA Standard introuvable
            </span>
          ) : (
            <strong className="text-foreground">{productCode}</strong>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit rounded-[9px]"
          disabled={productCode === undefined}
          onClick={() => {
            if (productCode !== undefined) downloadTemplate(productCode)
          }}
        >
          <Download className="size-3.5" />
          Télécharger un modèle
        </Button>
      </div>

      <CsvDropZone
        id="accessories-csv"
        file={file}
        disabled={productCode === undefined}
        onFileChange={(f) => void onFileChange(f)}
      />

      {precheck?.headerError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[12.5px] font-medium text-destructive">
          {precheck.headerError}
        </p>
      )}

      {precheck && precheck.badLines.length > 0 && (
        <div className="rounded-lg bg-destructive/10 p-3 text-[12.5px] text-destructive">
          <p className="font-semibold">
            Import bloqué : {precheck.badLines.length} ligne(s) ne ciblent pas
            IA Standard (productCode attendu&nbsp;: {productCode}).
          </p>
          <ul className="mt-1.5 flex max-h-32 flex-col gap-0.5 overflow-y-auto">
            {precheck.badLines.map((l) => (
              <li key={l.line}>
                Ligne {l.line} : productCode «&nbsp;{l.found || 'vide'}&nbsp;»
              </li>
            ))}
          </ul>
        </div>
      )}

      {precheck && !blocked && (
        <p className="text-[12.5px] text-muted-foreground">
          {precheck.rowCount} ligne(s) détectée(s), prête(s) à être envoyée(s).
        </p>
      )}

      {rejected.length > 0 && (
        <div className="rounded-lg bg-destructive/10 p-3 text-[12.5px] text-destructive">
          <p className="font-semibold">
            Import refusé — {rejected.length} erreur(s). Aucune tranche n’a été
            importée.
          </p>
          <ul className="mt-1.5 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {rejected.map((err, i) => (
              <li key={i}>{importErrorLabel(err)}</li>
            ))}
          </ul>
        </div>
      )}
    </FormDialog>
  )
}
