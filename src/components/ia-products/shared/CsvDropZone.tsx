import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface CsvDropZoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
  /** Id du champ (libellé accessible). */
  id: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

/**
 * Zone de dépôt de fichier CSV en français (glisser-déposer + bouton
 * « Choisir un fichier »), à la place du champ natif `input[type=file]`
 * dont les libellés dépendent de la langue du navigateur.
 */
export function CsvDropZone({
  file,
  onFileChange,
  disabled,
  id,
}: CsvDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)

  const accept = (candidate: File | undefined) => {
    if (!candidate) return
    if (!/\.csv$/i.test(candidate.name)) {
      setRejected('Seuls les fichiers .csv sont acceptés.')
      return
    }
    setRejected(null)
    onFileChange(candidate)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (!disabled) accept(e.dataTransfer.files[0])
        }}
        className={cn(
          'flex flex-col items-center gap-2.5 rounded-[12px] border-2 border-dashed px-4 py-5 text-center transition-colors',
          over ? 'border-primary bg-primary/5' : 'border-input bg-muted/30',
          disabled && 'opacity-60',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".csv,text/csv"
          disabled={disabled}
          className="sr-only"
          aria-label="Fichier CSV"
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {file ? (
          <div className="flex w-full items-center gap-3 text-left">
            <FileSpreadsheet className="size-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[13.5px] font-semibold"
                title={file.name}
              >
                {file.name}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {formatSize(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Retirer le fichier"
              disabled={disabled}
              onClick={() => {
                setRejected(null)
                onFileChange(null)
              }}
            >
              <X />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              Glissez-déposez votre fichier CSV ici, ou
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-[9px]"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Choisir un fichier
            </Button>
          </>
        )}
      </div>
      {rejected && (
        <p role="alert" className="text-[12px] font-medium text-destructive">
          {rejected}
        </p>
      )}
    </div>
  )
}
