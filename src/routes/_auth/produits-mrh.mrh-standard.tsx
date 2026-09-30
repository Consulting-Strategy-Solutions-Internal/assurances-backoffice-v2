import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { HeaderActionSlot } from '#/components/ia-products/shared/header-action'
import { ScrollShadow } from '#/components/layout/ScrollShadow'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/_auth/produits-mrh/mrh-standard')({
  component: MrhStandardLayout,
})

const TABS = [
  {
    to: '/produits-mrh/mrh-standard/situations',
    value: 'situations',
    label: 'Situations & taux',
    title: 'Situations et taux de base',
    description:
      'Les quatre situations de la grille NSIA et leurs taux de base (‰). Grille figée : seuls les chiffres et les libellés se modifient.',
  },
  {
    to: '/produits-mrh/mrh-standard/garanties',
    value: 'garanties',
    label: 'Garanties',
    title: 'Garanties',
    description: 'Les onze garanties MRH, leur libellé et leur taux de taxe.',
  },
  {
    to: '/produits-mrh/mrh-standard/tarifs',
    value: 'tarifs',
    label: 'Garanties par situation',
    title: 'Garanties par situation',
    description:
      'Tarif de chaque garantie proposée dans chaque situation, selon son mode de calcul.',
  },
  {
    to: '/produits-mrh/mrh-standard/accessoires',
    value: 'accessoires',
    label: 'Accessoires',
    title: 'Frais accessoires',
    description: 'Frais d’accessoires par tranche de prime nette.',
  },
] as const

function MrhStandardLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const current = TABS.find((t) => pathname.startsWith(t.to)) ?? TABS[0]
  const active = current.value

  return (
    <>
      <PageHeader
        title={current.title}
        subtitle={`Multirisque Habitation · MRH Standard — ${current.description}`}
      >
        <HeaderActionSlot />
      </PageHeader>
      <Tabs value={active} className="gap-4">
        <ScrollShadow>
          <TabsList className="h-11 gap-1 bg-[#e6ebf3] p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                asChild
                className="h-full flex-none px-4 text-[13.5px] font-semibold text-foreground/75 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
              >
                <Link to={t.to}>{t.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollShadow>
        <Outlet />
      </Tabs>
    </>
  )
}
