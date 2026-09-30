import { StatusPill } from '#/components/dashboard/StatusPill'

/** Pastille Active / Inactive. */
export function StatusBadge({ active }: { active: boolean }) {
  return (
    <StatusPill tone={active ? 'success' : 'neutral'}>
      {active ? 'Active' : 'Inactive'}
    </StatusPill>
  )
}

/** Liste de motifs d'échec (ex. suppression refusée pour plusieurs raisons). */
export function ReasonList({
  title,
  reasons,
}: {
  title: string
  reasons: string[]
}) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive"
    >
      <p className="font-semibold">{title}</p>
      <ul className="mt-1 list-disc pl-5">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
