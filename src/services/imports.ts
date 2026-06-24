import { api } from '#/lib/api'

export interface RowError {
  line: number
  message: string
}

export interface ImportResult {
  imported: number
  errors: RowError[]
}

/**
 * Uploads a CSV file to a bulk-import endpoint (multipart/form-data).
 * Setting Content-Type to multipart lets axios compute the boundary itself,
 * overriding the instance's default application/json.
 */
export async function importCsv(
  url: string,
  file: File,
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
