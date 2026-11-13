/* eslint-disable react-hooks/set-state-in-effect -- initial load intentionally starts request state */
import { useCallback, useEffect, useState } from "react";
import { ArrayPanel } from "../components/dsa/ArrayPanel";
import { GraphPanel } from "../components/dsa/GraphPanel";
import {
  HashSetPanel,
  LinkedListPanel,
  QueuePanel,
  StackPanel,
} from "../components/dsa/StructurePanels";
import { IdentifierLab } from "../components/dsa/IdentifierLab";
import { TreePanel } from "../components/dsa/TreePanel";
import { getDsaOverview } from "../dsa/dsa.api";
import type { DsaOverview } from "../dsa/dsa.types";

type Tab =
  "linkedList" | "queue" | "stack" | "hashSet" | "tree" | "graph" | "arrays";
const tabs: Array<{ id: Tab; label: string; short: string }> = [
  { id: "linkedList", label: "Borrowing timeline", short: "Timeline" },
  { id: "queue", label: "Waitlist flow", short: "Waitlists" },
  { id: "stack", label: "Recent catalog activity", short: "Activity" },
  { id: "hashSet", label: "Identifier integrity", short: "Identifiers" },
  { id: "tree", label: "Title index", short: "Index" },
  { id: "graph", label: "Related-title network", short: "Network" },
  { id: "arrays", label: "Catalog ranking", short: "Ranking" },
];

export function DsaLabPage() {
  const [data, setData] = useState<DsaOverview | null>(null);
  const [tab, setTab] = useState<Tab>("linkedList");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getDsaOverview());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load collection intelligence",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function moveTab(key: string) {
    const current = tabs.findIndex((item) => item.id === tab);
    const next =
      key === "ArrowRight"
        ? (current + 1) % tabs.length
        : key === "ArrowLeft"
          ? (current - 1 + tabs.length) % tabs.length
          : key === "Home"
            ? 0
            : key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    const target = tabs[next];
    if (!target) return;
    setTab(target.id);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${target.id}`)?.focus(),
    );
  }
  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-forest-light">
            Collection operations
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">
            Collection intelligence
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review circulation patterns, waitlist order, catalog integrity,
            title relationships, and ranking activity from the latest library
            records.
          </p>
        </div>
        <button
          className="border border-forest px-4 py-2.5 text-sm font-semibold text-forest"
          onClick={() => void load()}
        >
          Refresh analysis
        </button>
      </header>
      <div
        className="mt-7 overflow-x-auto border-b border-line"
        role="tablist"
        aria-label="Collection analysis views"
      >
        {tabs.map((item) => (
          <button
            id={`tab-${item.id}`}
            key={item.id}
            role="tab"
            tabIndex={tab === item.id ? 0 : -1}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            className={`border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap ${tab === item.id ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink"}`}
            onKeyDown={(event) => {
              if (
                ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                moveTab(event.key);
              }
            }}
            onClick={() => setTab(item.id)}
          >
            <span className="sm:hidden">{item.short}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>
      {error && (
        <div
          className="mt-5 flex items-center justify-between border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <span>{error}</span>
          <button
            className="font-semibold underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <Skeleton />
      ) : (
        data && (
          <div
            className="mt-5"
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
          >
            <Panel tab={tab} data={data} />
            <p className="mt-4 text-xs leading-5 text-muted">
              Analysis refreshed{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "medium",
              }).format(new Date(data.generatedAt))}
              . Data is read-only and sourced from the current library records.
            </p>
          </div>
        )
      )}
    </div>
  );
}
function Panel({ tab, data }: { tab: Tab; data: DsaOverview }) {
  if (tab === "linkedList") return <LinkedListPanel data={data.linkedList} />;
  if (tab === "queue") return <QueuePanel data={data.queue} />;
  if (tab === "stack") return <StackPanel data={data.stack} />;
  if (tab === "hashSet")
    return (
      <div className="space-y-5">
        <HashSetPanel data={data.hashSet} />
        <IdentifierLab />
      </div>
    );
  if (tab === "tree") return <TreePanel data={data.tree} />;
  if (tab === "graph") return <GraphPanel data={data.graph} />;
  return <ArrayPanel data={data.arrays} />;
}
function Skeleton() {
  return (
    <div
      className="mt-5 space-y-3"
      aria-busy="true"
      aria-label="Loading collection analysis"
    >
      <div className="h-36 animate-pulse border border-line bg-surface" />
      <div className="h-52 animate-pulse border border-line bg-surface" />
    </div>
  );
}
