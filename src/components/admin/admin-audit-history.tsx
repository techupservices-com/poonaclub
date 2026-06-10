"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { formatMobile } from "@/lib/utils";

interface AuditHistoryItem {
  id: string;
  action: string;
  actorType: string;
  createdAt: string;
  formattedCreatedAt: string;
  targetProfileId: string;
  memberName: string;
  membershipId: string;
  mobile: string;
}

export function AdminAuditHistory({
  items,
  total,
  currentPage,
  pageSize,
  query,
}: {
  items: AuditHistoryItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  query: string;
}) {
  const router = useRouter();
  const [currentItems, setCurrentItems] = useState(items);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(query);
  const pageCount = Math.max(1, Math.ceil(currentTotal / pageSize));

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentPage > 1) params.set("page", String(currentPage));
      if (query) params.set("q", query);
      const response = await fetch(`/api/admin/audit${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh audit history.");
        return;
      }
      setCurrentItems(payload.items ?? []);
      setCurrentTotal(payload.total ?? currentTotal);
    } catch {
      setError("Unable to refresh audit history.");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPage, currentTotal, isRefreshing, query]);

  useVisiblePolling(60000, refresh);

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (query) params.set("q", query);
    router.push(`/admin/audit${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function runSearch() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    router.push(`/admin/audit${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearSearch() {
    setSearch("");
    router.push("/admin/audit");
  }

  return (
    <section className="soft-card rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Audit history</h2>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") runSearch();
          }}
          placeholder="Search by member name, mobile number, email address"
          className="w-full flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
        />
        <button
          type="button"
          onClick={runSearch}
          className="h-12 rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]"
        >
          Search
        </button>
        <button
          type="button"
          onClick={clearSearch}
          className="h-12 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
        >
          Clear
        </button>
      </div>
      <div className="mt-6 grid gap-3">
        {currentTotal === 0 ? (
          <p className="text-sm text-[var(--muted)]">{query ? "No audit records match this search." : "No edits recorded yet. Changes from member or admin forms will appear here."}</p>
        ) : (
          currentItems.map((entry) => (
            <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">{entry.action}</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">
                    {entry.memberName} · {entry.membershipId} · {formatMobile(entry.mobile)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{entry.actorType} · target {entry.targetProfileId}</p>
                </div>
                <p className="text-xs text-[var(--muted)]">{entry.formattedCreatedAt}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {currentTotal > pageSize ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, currentTotal)} of {currentTotal} audit records
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => goToPage(Math.max(1, currentPage - 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
            <button disabled={currentPage === pageCount} onClick={() => goToPage(Math.min(pageCount, currentPage + 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </section>
  );
}
