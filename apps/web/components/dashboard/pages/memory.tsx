"use client";

import { LibraryToolbar } from "@/components/dashboard/features/common/library-toolbar";
import { PageHeading } from "@/components/dashboard/features/common/page-heading";
import { PaginationControls } from "@/components/dashboard/features/common/pagination-controls";
import { EmptyMemory } from "@/components/dashboard/features/memory/empty-memory";
import { MemoryCard } from "@/components/dashboard/features/memory/memory-card";
import { WorkspacePage } from "@/components/dashboard/layout/workspace-page";
import { useMemories } from "@/hooks/useMemories";
import {
  MEMORY_SCOPES,
  MEMORY_SOURCE_TYPES,
  type MemoryScope,
  type MemorySourceType,
} from "@repo/contracts/memory";
import { Button } from "@repo/ui/button";
import { useDeferredValue, useState } from "react";

type EmbeddingStatus = "pending" | "processing" | "complete" | "failed";

export function MemoryPage() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<MemoryScope | "">("");
  const [sourceType, setSourceType] = useState<MemorySourceType | "">("");
  const [status, setStatus] = useState<EmbeddingStatus | "">("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim());
  const memories = useMemories({
    query: deferredQuery,
    scope: scope || undefined,
    sourceType: sourceType || undefined,
    embeddingStatus: status || undefined,
    page,
    limit: 20,
  });
  const result = memories.data?.data.data;
  const items = result?.items ?? [];
  const filtered = Boolean(deferredQuery || scope || sourceType || status);

  return (
    <WorkspacePage>
      <PageHeading
        eyebrow="Library"
        title="Memory"
        description="Review and control the context Repin can recall across your workspace."
      />
      <LibraryToolbar
        query={query}
        onQueryChange={(value) => { setQuery(value); setPage(1); }}
        placeholder="Search memory"
      >
        <FilterSelect
          label="Source"
          value={sourceType}
          onChange={(value) => { setSourceType(value as MemorySourceType | ""); setPage(1); }}
          options={MEMORY_SOURCE_TYPES.map((value) => ({
            value,
            label: value.replaceAll("_", " "),
          }))}
        />
        <FilterSelect
          label="Scope"
          value={scope}
          onChange={(value) => { setScope(value as MemoryScope | ""); setPage(1); }}
          options={MEMORY_SCOPES.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => { setStatus(value as EmbeddingStatus | ""); setPage(1); }}
          options={[
            { value: "pending", label: "pending" },
            { value: "processing", label: "processing" },
            { value: "complete", label: "enriched" },
            { value: "failed", label: "failed" },
          ]}
        />
      </LibraryToolbar>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {memories.isLoading
            ? "Loading memory…"
            : `${result?.total ?? 0} ${(result?.total ?? 0) === 1 ? "memory" : "memories"}`}
        </span>
        <span>
          {filtered ? "Filtered results" : "Sorted by recently updated"}
        </span>
      </div>
      {memories.isError ? (
        <>
          <EmptyMemory
            title="Memory could not be loaded"
            description="Check your connection and try again."
          />
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => void memories.refetch()}>
              Try again
            </Button>
          </div>
        </>
      ) : null}
      {!memories.isLoading && !memories.isError && items.length ? (
        <section className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 xl:grid-cols-3">
          {items.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </section>
      ) : null}
      {!memories.isLoading && !memories.isError && !items.length ? (
        <EmptyMemory
          title={
            filtered ? "No memories found" : "Repin has nothing in memory yet"
          }
          description={
            filtered
              ? "Try a different search or filter."
              : "Add a bookmark, note, or highlight to memory to make its useful context available later."
          }
        />
      ) : null}
      {result && result.pageCount > 1 ? (
        <div className="mt-5">
          <PaginationControls page={result.page} pageCount={result.pageCount} onPageChange={setPage} />
        </div>
      ) : null}
    </WorkspacePage>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
}) {
  return (
    <>
      <label className="sr-only" htmlFor={`memory-${label.toLowerCase()}`}>
        {label}
      </label>
      <select
        id={`memory-${label.toLowerCase()}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm capitalize shadow-none"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}
