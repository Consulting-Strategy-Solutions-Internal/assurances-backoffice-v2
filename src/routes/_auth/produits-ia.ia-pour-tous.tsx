import { pageHead } from '#/lib/page-title'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { FormulasScreen } from '#/components/ia-products/formulas/FormulasScreen'

export const Route = createFileRoute('/_auth/produits-ia/ia-pour-tous')({
  head: pageHead('IA Pour Tous · Formules'),
  component: IaPourTousPage,
})

function IaPourTousPage() {
  return (
    <>
      <PageHeader
        title="IA Pour Tous"
        subtitle="Individuel Accidents · formules et garanties forfaitaires proposées au client et au vendeur"
      />
      <FormulasScreen />
    </>
  )
}
