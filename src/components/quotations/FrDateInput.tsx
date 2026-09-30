import { useId, useState } from 'react'
import { Input } from '#/components/ui/input'
import { isoToFrDate, maskFrDate, parseFrDate } from '#/lib/claims'

/**
 * Champ date « jj/mm/aaaa » masqué (même saisie que « Déclarer un sinistre »),
 * indépendant de la langue du navigateur. `value` / `onChange` échangent des
 * dates ISO « aaaa-mm-jj » ; `onChange(undefined)` quand le champ est vidé.
 * Une saisie incomplète ou invalide retire la date (`onChange(undefined)`)
 * pour ne pas laisser filtrer sur une ancienne valeur ; une date complète
 * mais impossible (31/02/2026) affiche « Date invalide ».
 */
export function FrDateInput({
  id,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string
  value?: string
  onChange: (iso: string | undefined) => void
  className?: string
  'aria-label'?: string
}) {
  const [text, setText] = useState(() => isoToFrDate(value))
  // Resynchronise quand la valeur change de l'extérieur (« Réinitialiser »).
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if ((parseFrDate(text) ?? undefined) !== value) setText(isoToFrDate(value))
  }

  const invalid = text.length === 10 && parseFrDate(text) == null
  const errorId = useId()

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj/mm/aaaa"
        maxLength={10}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        value={text}
        onChange={(event) => {
          const next = maskFrDate(event.target.value)
          setText(next)
          if (next === '') onChange(undefined)
          else {
            const iso = parseFrDate(next)
            if (iso) onChange(iso)
            else if (value !== undefined) onChange(undefined)
          }
        }}
        className={className}
      />
      {invalid && (
        <p
          id={errorId}
          role="alert"
          className="absolute top-full left-0 mt-0.5 text-[11.5px] font-medium whitespace-nowrap text-destructive"
        >
          Date invalide
        </p>
      )}
    </div>
  )
}
