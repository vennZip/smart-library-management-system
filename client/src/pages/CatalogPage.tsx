/* eslint-disable react-hooks/set-state-in-effect -- route changes intentionally initiate a new request state */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { archiveBook, createBook, listBooks, updateBook } from '../catalog/catalog.api'
import type { BookInput, BookRecord, CatalogPage } from '../catalog/catalog.types'
import { useAuth } from '../auth/useAuth'
import { BookFormDialog } from '../components/catalog/BookFormDialog'
import { Icon } from '../components/icons/Icon'

export function CatalogPage() {
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const [pageData, setPageData] = useState<CatalogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchDraft, setSearchDraft] = useState(params.get('search') ?? '')
  const [editing, setEditing] = useState<BookRecord | null | undefined>(undefined)
  const staff = role === 'admin' || role === 'librarian'
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const includeArchived = staff && params.get('archived') === 'true'
  const categories = useMemo(() => [...new Set(pageData?.items.map(book => book.category).filter(Boolean) ?? [])].sort(), [pageData])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPageData(await listBooks(search, page, includeArchived))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the catalog')
    } finally {
      setLoading(false)
    }
  }, [includeArchived, page, search])

  useEffect(() => { void load() }, [load])

  function setSearch(value: string) {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('search', value.trim())
    else next.delete('search')
    next.set('page', '1')
    setSearchDraft(value)
    setParams(next)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchDraft)
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  async function save(input: BookInput) {
    if (editing) await updateBook(editing.id, input)
    else await createBook(input)
    setEditing(undefined)
    await load()
  }

  async function archive(book: BookRecord) {
    if (!window.confirm(`Archive “${book.title}”? It will be hidden from students but retained for records.`)) return
    try {
      await archiveBook(book.id)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not archive the book')
    }
  }

  return <div className="mx-auto max-w-[1400px]">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">Library collection</p><h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Browse books</h1><p className="mt-2 text-sm text-muted">Explore the collection by cover, title, author, or category.</p></div>
      {staff && <button className="bg-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-light" onClick={() => setEditing(null)}>Add book</button>}
    </div>

    <div className="mt-7 flex flex-col gap-3 border border-line bg-surface p-4 md:flex-row md:items-center">
      <form className="flex min-w-0 flex-1" onSubmit={submitSearch}><label className="relative min-w-0 flex-1"><span className="sr-only">Search catalog</span><Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="w-full border border-line bg-paper py-2.5 pl-9 pr-3 text-sm" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search title, author, ISBN, or category" /></label><button className="bg-forest px-4 text-sm font-semibold text-white">Search</button></form>
      {search && <button className="text-left text-sm font-semibold text-forest hover:underline" onClick={() => setSearch('')}>Clear search</button>}
      {staff && <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={includeArchived} onChange={event => { const next = new URLSearchParams(params); if (event.target.checked) next.set('archived', 'true'); else next.delete('archived'); next.set('page', '1'); setParams(next) }} /> Include archived</label>}
    </div>

    {!loading && categories.length > 0 && <section className="mt-5" aria-labelledby="categories-heading"><div className="flex items-center justify-between gap-4"><h2 id="categories-heading" className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Browse by category</h2><span className="text-xs text-muted">{pageData?.total ?? 0} books</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-2"><button className={`shrink-0 border px-3 py-2 text-xs font-semibold transition ${!search ? 'border-forest bg-forest text-white' : 'border-line bg-surface text-forest hover:border-forest'}`} onClick={() => setSearch('')}>All books</button>{categories.map(category => <button key={category} className={`shrink-0 border px-3 py-2 text-xs font-semibold transition ${search.toLowerCase() === category.toLowerCase() ? 'border-forest bg-forest text-white' : 'border-line bg-surface text-forest hover:border-forest'}`} onClick={() => setSearch(category)}>{category}</button>)}</div></section>}

    {error && <div className="mt-5 flex items-center justify-between border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert"><span>{error}</span><button className="font-semibold underline" onClick={() => void load()}>Retry</button></div>}
    {loading ? <CatalogSkeleton /> : pageData && pageData.items.length > 0 ? <><section className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5" aria-label="Book cover gallery">{pageData.items.map(book => <BookGalleryCard key={book.id} book={book} staff={staff} onEdit={() => setEditing(book)} onArchive={() => void archive(book)} />)}</section><Pagination data={pageData} onPage={changePage} /></> : !error && <div className="mt-5 border border-dashed border-line bg-surface px-6 py-16 text-center" role="status"><div className="mx-auto grid size-12 place-items-center bg-green-50 text-forest"><Icon name="book" /></div><h2 className="mt-4 font-serif text-xl">No books found</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted">{search ? 'Try a broader title, author, ISBN, or category.' : 'The catalog is empty. Library staff can add the first record.'}</p></div>}
    {editing !== undefined && <BookFormDialog book={editing} onClose={() => setEditing(undefined)} onSave={save} />}
  </div>
}

function BookGalleryCard({ book, staff, onEdit, onArchive }: { book: BookRecord; staff: boolean; onEdit: () => void; onArchive: () => void }) {
  return <article className={`group flex min-w-0 flex-col ${book.archivedAt ? 'opacity-65' : ''}`}>
    <Link className="relative block aspect-[2/3] overflow-hidden border border-line bg-green-50 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-forest hover:shadow-md focus-visible:-translate-y-1" to={`/catalog/${book.id}`} aria-label={`View ${book.title} by ${book.author}`}>
      <BookCover book={book} />
      <span className={`absolute left-2 top-2 border px-2 py-1 text-[10px] font-bold ${book.availableCopies > 0 ? 'border-emerald-200 bg-white/95 text-emerald-700' : 'border-amber-200 bg-white/95 text-amber-800'}`}>{book.availableCopies > 0 ? `${book.availableCopies} available` : 'Currently unavailable'}</span>
      {book.archivedAt && <span className="absolute right-2 top-2 bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase text-white">Archived</span>}
    </Link>
    <div className="flex flex-1 flex-col pt-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-forest-light">{book.category}</p><h2 className="mt-1 line-clamp-2 font-serif text-base leading-snug sm:text-lg"><Link className="hover:text-forest hover:underline" to={`/catalog/${book.id}`}>{book.title}</Link></h2><p className="mt-1 line-clamp-1 text-xs text-muted">{book.author}{book.publicationYear ? ` · ${book.publicationYear}` : ''}</p><p className="mt-2 text-xs text-muted">{book.availableCopies} of {book.totalCopies} copies available</p>{staff && <div className="mt-auto flex gap-3 pt-3 text-xs"><button className="font-semibold text-forest hover:underline" onClick={onEdit}>Edit</button><button className="font-semibold text-red-700 hover:underline" onClick={onArchive}>Archive</button></div>}</div>
  </article>
}

function BookCover({ book }: { book: BookRecord }) {
  const [failed, setFailed] = useState(false)
  if (!book.coverUrl || failed) return <div className="flex h-full flex-col items-center justify-center bg-forest px-4 text-center text-white"><Icon name="book" className="size-10 text-gold" /><span className="mt-4 line-clamp-3 font-serif text-lg leading-snug">{book.title}</span><span className="mt-2 text-xs text-white/70">{book.author}</span></div>
  return <img className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={book.coverUrl} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailed(true)} />
}

function Pagination({ data, onPage }: { data: CatalogPage; onPage: (page: number) => void }) {
  return <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-sm sm:flex-row"><p className="text-muted">{data.total} {data.total === 1 ? 'book' : 'books'}</p><div className="flex items-center gap-2"><button className="border border-line bg-surface px-3 py-2 transition hover:border-forest disabled:opacity-40" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button><span className="px-2">Page {data.page} of {data.totalPages}</span><button className="border border-line bg-surface px-3 py-2 transition hover:border-forest disabled:opacity-40" disabled={data.page >= data.totalPages} onClick={() => onPage(data.page + 1)}>Next</button></div></div>
}

function CatalogSkeleton() {
  return <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Loading book gallery">{Array.from({ length: 10 }, (_, index) => <div key={index}><div className="aspect-[2/3] animate-pulse border border-line bg-green-100" /><div className="mt-3 h-4 w-4/5 animate-pulse bg-line" /><div className="mt-2 h-3 w-1/2 animate-pulse bg-line" /></div>)}</div>
}
