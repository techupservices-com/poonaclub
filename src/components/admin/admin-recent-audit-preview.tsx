"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { formatMobile } from "@/lib/utils";

interface RecentAuditItem {
  id: string;
  action: string;
  actorType: string;
  createdAt: string;
  memberName: string;
  membershipId: string;
  mobile: string;
}

export function AdminRecentAuditPreview({ initialItems }: { initialItems: RecentAuditItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/audit/recent", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh recent activity.");
        return;
      }
      setItems(payload.items ?? []);
    } catch {
      setError("Unable to refresh recent activity.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useVisiblePolling(30000, refresh);

  return (
    <div className="soft-card rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Recent activity</p>
          <h2 className="mt-2 text-2xl font-semibold">Recent audit events</h2>
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
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No admin changes recorded yet.</p>
        ) : (
          items.map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="font-medium">{entry.action}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                {entry.memberName} · {entry.membershipId} · {formatMobile(entry.mobile)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {entry.actorType} · {new Date(entry.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))
        )}
      </div>
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
