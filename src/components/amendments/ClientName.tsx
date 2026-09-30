/** Client d'une modification ; « Client supprimé » en grisé quand le compte n'existe plus. */
export function ClientName({ name }: { name?: string | null }) {
  return name ? (
    <>{name}</>
  ) : (
    <span className="text-muted-foreground">Client supprimé</span>
  )
}
