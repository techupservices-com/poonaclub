"use client";

import { useMemo, useState } from "react";
import { PAGE_SIZE } from "@/lib/constants";

interface DocumentsQueueItem {
  id: string;
  fullName: string;
  membershipId: string;
  selfieUploaded: boolean;
  documentUploaded: boolean;
}

export function AdminDocumentsQueue({ items }: { items: DocumentsQueueItem[] }) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items],
  );

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Document review queue</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        This queue helps the admin review which members still need selfie or supporting document uploads.
      </p>
      <div className="mt-6 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No pending document records at the moment.</p>
        ) : (
          pagedItems.map((member) => (
            <div key={member.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="font-medium">{member.fullName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {member.membershipId} · Selfie: {member.selfieUploaded ? "Yes" : "No"} · Document: {member.documentUploaded ? "Yes" : "No"}
              </p>
            </div>
          ))
        )}
      </div>

      {items.length > PAGE_SIZE ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length} members
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
