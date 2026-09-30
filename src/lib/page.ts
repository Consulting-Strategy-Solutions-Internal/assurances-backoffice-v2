/** Spring Data page envelope returned by every paginated endpoint. */
/** Le backend plafonne `size` à 100 sans erreur. */
export const MAX_PAGE_SIZE = 100

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** Common pagination query params (`sort` = `champ,asc|desc`). */
export interface PageParams {
  page?: number
  size?: number
  sort?: string
}
