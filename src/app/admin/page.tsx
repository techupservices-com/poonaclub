import Link from "next/link";
import { AdminRecentAuditPreview } from "@/components/admin/admin-recent-audit-preview";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { getAdminOverviewSummary, getRecentAuditPreviewData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { totalMembers, verified, sharedMobileGroups, needsAction, members } = await getAdminOverviewSummary();
  const recentAuditItems = (await getRecentAuditPreviewData(4)).items;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Total members</p><p className="mt-3 text-4xl font-semibold">{totalMembers}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Verified</p><p className="mt-3 text-4xl font-semibold">{verified}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Shared mobile groups</p><p className="mt-3 text-4xl font-semibold">{sharedMobileGroups}</p></div>
        <div className="soft-card rounded-[26px] p-5"><p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Needs action</p><p className="mt-3 text-4xl font-semibold">{needsAction}</p></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="soft-card rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Main admin action</p>
              <h2 className="text-2xl font-semibold">Member directory</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the directory to search members, review verification progress, open full details, or correct profile information.</p>
            </div>
            <Link href="/admin/members" className="rounded-full bg-[#3c589e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f467e]">Open members</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {members.slice(0, 4).map((member) => (
              <div key={member.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} />
                  <div>
                    <p className="font-semibold">{member.fullName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · {member.currentMobile}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AdminRecentAuditPreview initialItems={recentAuditItems} />
      </section>
    </>
  );
}
