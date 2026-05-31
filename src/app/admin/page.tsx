import Link from "next/link";
import { listAuditLogs, listMembersWithVerification } from "@/lib/data";

export default async function AdminOverviewPage() {
  const members = await listMembersWithVerification();
  const auditLogs = (await listAuditLogs()).slice(0, 4);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Total members</p><p className="mt-3 text-4xl font-semibold">{members.length}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Verified</p><p className="mt-3 text-4xl font-semibold">{members.filter((member) => member.verification.completed).length}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Shared mobile groups</p><p className="mt-3 text-4xl font-semibold">{new Set(members.filter((member) => member.linkedMemberCount > 1).map((member) => member.currentMobile)).size}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Needs action</p><p className="mt-3 text-4xl font-semibold">{members.filter((member) => !member.verification.completed).length}</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="soft-card rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Member directory</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Grid and list views follow the screenshot direction while improving spacing, search, and verification visibility.</p>
            </div>
            <Link href="/admin/members" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Open members</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {members.slice(0, 4).map((member) => (
              <div key={member.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
                <p className="font-semibold">{member.fullName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · {member.currentMobile}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <h2 className="text-2xl font-semibold">Recent audit events</h2>
          <div className="mt-6 space-y-3">
            {auditLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">No admin changes recorded yet.</p> : auditLogs.map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
                <p className="font-medium">{entry.action}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Target member: {entry.targetProfileId}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
