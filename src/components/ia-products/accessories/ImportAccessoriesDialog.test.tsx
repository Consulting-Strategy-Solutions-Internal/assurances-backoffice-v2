// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ImportAccessoriesDialog } from './ImportAccessoriesDialog'

vi.mock('#/services/products', () => ({
  findIaProduct: vi.fn().mockResolvedValue({ productCode: 7 }),
}))
vi.mock('#/services/accessories', () => ({ importAccessoriesCsv: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('#/components/forms/FormDialog', () => ({
  FormDialog: (p: { children: React.ReactNode }) => <div>{p.children}</div>,
}))
vi.mock('#/components/ia-products/shared/CsvDropZone', () => ({
  CsvDropZone: (p: { onFileChange: (f: File | null) => void }) => {
    const w = window as unknown as { files: Record<string, File> }
    return (
      <>
        <button type="button" onClick={() => p.onFileChange(w.files.a)}>
          pick-a
        </button>
        <button type="button" onClick={() => p.onFileChange(w.files.b)}>
          pick-b
        </button>
      </>
    )
  },
}))

afterEach(cleanup)

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

it('ignore le pré-contrôle d’un fichier qui n’est plus le fichier courant (R1-18)', async () => {
  const a = deferred<string>()
  const b = deferred<string>()
  ;(window as unknown as { files: Record<string, unknown> }).files = {
    a: { text: () => a.promise },
    b: { text: () => b.promise },
  }
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <ImportAccessoriesDialog onClose={() => undefined} />
    </QueryClientProvider>,
  )
  // attendre le produit (productCode chargé)
  await screen.findByText('7')

  await act(async () => screen.getByText('pick-a').click())
  await act(async () => screen.getByText('pick-b').click())
  // B (courant) se termine d'abord : en-tête invalide.
  await act(async () => b.resolve('foo;bar\n1;2'))
  await screen.findByText(/En-tête manquant ou invalide/)
  // A (caduc) se termine ensuite avec un fichier valide : doit être ignoré.
  await act(async () => a.resolve('productCode,x\n7,1\n7,2'))
  expect(screen.queryByText(/prête\(s\) à être envoyée\(s\)/)).toBeNull()
  expect(screen.getByText(/En-tête manquant ou invalide/)).toBeTruthy()
})
