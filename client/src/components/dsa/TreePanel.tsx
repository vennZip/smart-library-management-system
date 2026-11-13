import { useState, type FormEvent } from "react";
import { searchTitleTree } from "../../dsa/dsa.api";
import type { TreeOverview, TreeSearchResult } from "../../dsa/dsa.types";
import { ComplexityTable } from "./ComplexityTable";
import { TreeDiagram } from "./TreeDiagram";

export function TreePanel({ data }: { data: TreeOverview }) {
  const [query, setQuery] = useState(data.nodes[0]?.books[0]?.title ?? "");
  const [result, setResult] = useState<TreeSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setResult(await searchTitleTree(query));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tree search failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="border border-line bg-surface p-4 sm:p-6">
      <Header data={data} />
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Metric label="Values" value={data.size} />
        <Metric label="Unique keys" value={data.uniqueKeys} />
        <Metric label="Height" value={data.height} />
        <Metric label="Build comparisons" value={data.buildComparisons} />
        <Metric label="Build time" value={`${data.buildElapsedMs} ms`} />
      </dl>
      <TreeDiagram data={data} />
      <div className="mt-4 grid gap-3 border border-line bg-paper p-4 text-xs text-muted sm:grid-cols-3">
        <p>
          <strong className="block text-ink">Insertion rule</strong>Smaller
          normalized titles travel left; larger titles travel right.
        </p>
        <p>
          <strong className="block text-ink">Duplicate rule</strong>Equal title
          keys share one node bucket instead of creating another branch.
        </p>
        <p>
          <strong className="block text-ink">Search rule</strong>Each comparison
          eliminates one branch, unless the tree becomes skewed.
        </p>
      </div>
      <form className="mt-6 flex max-w-xl" onSubmit={search}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Exact title to find in tree</span>
          <input
            className="w-full border border-line bg-paper px-3 py-2.5 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Exact normalized title"
            required
          />
        </label>
        <button
          className="bg-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Searching…" : "Search tree"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p
          className="mt-3 border-l-2 border-forest bg-paper px-4 py-3 text-sm"
          role="status"
        >
          {result.matches.length
            ? `Found ${result.matches.length} matching record(s) after ${result.comparisons} comparison(s).`
            : `No exact match after ${result.comparisons} comparison(s).`}{" "}
          Runtime: {result.elapsedMs} ms.
        </p>
      )}
      <ComplexityTable rows={data.complexity} />
    </section>
  );
}
function Header({ data }: { data: TreeOverview }) {
  return (
    <header>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-forest-light">
        Title index
      </p>
      <h2 className="mt-1 font-serif text-2xl">{data.feature}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {data.rationale}
      </p>
    </header>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-line bg-paper p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
