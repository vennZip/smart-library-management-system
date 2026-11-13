import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { listBooks } from "../../catalog/catalog.api";
import type { BookRecord } from "../../catalog/catalog.types";
import { createReservation } from "../../reservations/reservation.api";

export function ReservationDialog({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  const find = useCallback(async (query: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await listBooks(query.trim(), 1);
      setBooks(
        result.items.filter(
          (book) => book.totalCopies > 0 && book.availableCopies === 0,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not browse the catalog",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void find(search), 250);
    return () => window.clearTimeout(timer);
  }, [find, search]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void find(search);
  }

  async function reserve(book: BookRecord) {
    setSaving(book.id);
    setError("");
    try {
      await createReservation(book.id);
      await onComplete();
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not join this waitlist",
      );
    } finally {
      setSaving("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-full max-w-3xl border border-line bg-surface p-5 sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">
              Catalog waitlist
            </p>
            <h2
              id="reservation-dialog-title"
              className="mt-1 font-serif text-3xl"
            >
              Reserve a book
            </h2>
            <p className="mt-2 text-sm text-muted">
              Browse titles whose physical copies are currently unavailable.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="p-2 text-xl text-muted"
            onClick={onClose}
            aria-label="Close reservation dialog"
          >
            ×
          </button>
        </div>
        <form className="mt-6 flex" role="search" onSubmit={submit}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Filter reservable books</span>
            <input
              className="w-full border border-line bg-paper px-3 py-2.5 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by title, author, ISBN, or category"
              autoComplete="off"
            />
          </label>
          {search && (
            <button
              type="button"
              className="border-y border-line px-3 text-xs font-semibold text-muted"
              onClick={() => setSearch("")}
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="bg-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </form>
        {error && (
          <p
            className="mt-4 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between border-b border-line pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Reservable titles
          </h3>
          <span className="text-xs text-muted" aria-live="polite">
            {loading ? "Updating list…" : `${books.length} shown`}
          </span>
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          {books.map((book) => (
            <article
              className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-line py-4 sm:grid-cols-[60px_minmax(0,1fr)_auto] sm:items-center"
              key={book.id}
            >
              <div className="aspect-[2/3] overflow-hidden border border-line bg-paper">
                {book.coverUrl ? (
                  <img
                    className="h-full w-full object-cover"
                    src={book.coverUrl}
                    alt=""
                  />
                ) : (
                  <div className="grid h-full place-items-center px-1 text-center text-[9px] uppercase tracking-wide text-muted">
                    No cover
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium">{book.title}</h4>
                <p className="mt-1 text-sm text-muted">{book.author}</p>
                <p className="mt-1 text-xs text-muted">
                  {book.category} · ISBN {book.isbn}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  All {book.totalCopies}{" "}
                  {book.totalCopies === 1 ? "copy is" : "copies are"} currently
                  unavailable
                </p>
              </div>
              <button
                type="button"
                className="col-start-2 border border-forest px-3 py-2 text-sm font-semibold text-forest disabled:opacity-50 sm:col-start-auto"
                disabled={Boolean(saving)}
                onClick={() => void reserve(book)}
              >
                {saving === book.id ? "Joining…" : "Join waitlist"}
              </button>
            </article>
          ))}
          {!loading && books.length === 0 && (
            <div className="py-10 text-center" role="status">
              <p className="font-medium">No reservable titles found</p>
              <p className="mt-1 text-sm text-muted">
                Try another search, or check again when all copies of a title
                are borrowed.
              </p>
            </div>
          )}
          {loading && (
            <div
              className="space-y-3 py-4"
              aria-busy="true"
              aria-label="Loading reservable titles"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div className="h-20 animate-pulse bg-paper" key={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
