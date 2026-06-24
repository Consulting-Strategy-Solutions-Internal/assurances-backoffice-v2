import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { FormDialog } from '#/components/forms/FormDialog'
import { apiErrorMessage } from '#/lib/api-error'
import { importCsv } from '#/services/imports'
import type { ImportResult } from '#/services/imports'

interface ImportCsvDialogProps {
  eyebrow: string
  title: string
  description?: string
  /** Endpoint path, e.g. '/products/import'. */
  url: string
  /** Expected CSV columns, shown to the user. */
  headerHint: string
  /** Query key to invalidate after a successful import. */
  invalidateKey: ReadonlyArray<unknown>
  onClose: () => void
}

/**
 * Generic CSV bulk-import dialog: pick a file, POST it as multipart, then show
 * the import result. Closes on a clean import; keeps the row-level errors
 * visible when the (all-or-nothing) import is rejected.
 */
export function ImportCsvDialog({
  eyebrow,
  title,
  description,
  url,
  headerHint,
  invalidateKey,
  onClose,
}: ImportCsvDialogProps) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (f: File) => importCsv(url, f),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      setResult(res)
      if (res.errors.length === 0) {
        toast.success(`${res.imported} ligne(s) importée(s).`)
        onClose()
      }
    },
  })

  const submit = async () => {
    setServerError(null)
    setResult(null)
    if (!file) {
      setServerError('Veuillez sélectionner un fichier CSV.')
      return
    }
    try {
      await mutateAsync(file)
    } catch (error) {
      setServerError(apiErrorMessage(error))
    }
  }

  return (
    <FormDialog
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      description={description}
      onSubmit={submit}
      submitLabel={isPending ? 'Import…' : 'Importer'}
      pending={isPending}
      submitDisabled={!file}
      error={serverError}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="csv-file" className="text-[13px]">
          Fichier CSV
        </Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="h-10 rounded-[10px] py-2"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <p className="text-[12px] text-muted-foreground">
          Colonnes attendues&nbsp;:{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[11.5px]">
            {headerHint}
          </code>
        </p>
      </div>

      {result && result.errors.length > 0 && (
        <div className="rounded-lg bg-destructive/10 p-3 text-[12.5px] text-destructive">
          <p className="font-semibold">
            Import refusé — {result.errors.length} erreur(s). Aucune ligne n'a
            été importée.
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {result.errors.map((err, i) => (
              <li key={i}>
                Ligne {err.line}&nbsp;: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </FormDialog>
  )
}
