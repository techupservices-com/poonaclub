import { listAuditLogs } from "@/lib/data";

export default async function AdminAuditPage() {
  const audits = await listAuditLogs();

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Audit history</h2>
      <div className="mt-6 grid gap-3">
        {audits.length === 0 ? <p className="text-sm text-[var(--muted)]">No edits recorded yet. Changes from member or admin forms will appear here.</p> : audits.map((entry) => (
          <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
            <p className="font-medium">{entry.action}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{entry.actorType} · target {entry.targetProfileId}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
