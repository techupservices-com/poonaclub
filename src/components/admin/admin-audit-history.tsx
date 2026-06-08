"use client";

import { useRouter } from "next/navigation";
import { formatMobile } from "@/lib/utils";

interface AuditHistoryItem {
  id: string;
  action: string;
  actorType: string;
  createdAt: string;
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
}: {
  items: AuditHistoryItem[];
  total: number;
  currentPage: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    router.push(`/admin/audit${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Audit history</h2>
      <div className="mt-6 grid gap-3">
        {total === 0 ? (
          <p className="text-sm text-[var(--muted)]">No edits recorded yet. Changes from member or admin forms will appear here.</p>
        ) : (
          items.map((entry) => (
            <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium">{entry.action}</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">
                    {entry.memberName} · {entry.membershipId} · {formatMobile(entry.mobile)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{entry.actorType} · target {entry.targetProfileId}</p>
                </div>
                <p className="text-xs text-[var(--muted)]">{new Date(entry.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {total > pageSize ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} of {total} audit records
          </p>
          <div className="flex gap-2">
            <button disabled={currentPage === 1} onClick={() => goToPage(Math.max(1, currentPage - 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
            <button disabled={currentPage === pageCount} onClick={() => goToPage(Math.min(pageCount, currentPage + 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
