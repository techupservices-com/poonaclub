"use client";

import { useRouter } from "next/navigation";
import { PAGE_SIZE } from "@/lib/constants";

interface DocumentsQueueItem {
  id: string;
  fullName: string;
  membershipId: string;
  selfieUploaded: boolean;
}

export function AdminDocumentsQueue({
  items,
  total,
  currentPage,
}: {
  items: DocumentsQueueItem[];
  total: number;
  currentPage: number;
}) {
  const router = useRouter();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    router.push(`/admin/documents${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Selfie review queue</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        This queue helps the admin review which members still need to upload their selfie photograph.
      </p>
      <div className="mt-6 grid gap-3">
        {total === 0 ? (
          <p className="text-sm text-[var(--muted)]">No members are currently pending selfie upload.</p>
        ) : (
          items.map((member) => (
            <div key={member.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="font-medium">{member.fullName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · Selfie: {member.selfieUploaded ? "Yes" : "No"}</p>
            </div>
          ))
        )}
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, total)} of {total} members
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
