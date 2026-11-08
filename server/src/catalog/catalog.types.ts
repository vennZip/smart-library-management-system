export interface BookRecord {
  id: string
  isbn: string
  title: string
  author: string
  publisher: string | null
  publicationYear: number | null
  category: string
  description: string | null
  coverUrl: string | null
  archivedAt: string | null
  totalCopies: number
  availableCopies: number
}

export interface BookInput {
  isbn: string
  title: string
  author: string
  publisher?: string | null
  publicationYear?: number | null
  category: string
  description?: string | null
  coverUrl?: string | null
}

export interface CatalogPage { items: BookRecord[]; page: number; pageSize: number; total: number; totalPages: number }
export interface CatalogQuery { search: string; page: number; pageSize: number; includeArchived: boolean }
