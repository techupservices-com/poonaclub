"use client";

import { useMemo, useState } from "react";
import { PAGE_SIZE } from "@/lib/constants";
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

export function AdminAuditHistory({ items }: { items: AuditHistoryItem[] }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items],
  );

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Audit history</h2>
      <div className="mt-6 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No edits recorded yet. Changes from member or admin forms will appear here.
          </p>
        ) : (
          pagedItems.map((entry) => (
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

      {items.length > PAGE_SIZE ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length} audit records
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
