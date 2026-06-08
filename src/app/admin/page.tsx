import Link from "next/link";
import { AdminRecentAuditPreview } from "@/components/admin/admin-recent-audit-preview";
import { AdminMemberPreview } from "@/components/admin/admin-member-preview";
import { getAdminOverviewSummary, getMemberPreviewData, getRecentAuditPreviewData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { totalMembers, verified, sharedMobileGroups, needsAction } = await getAdminOverviewSummary();
  const memberPreview = await getMemberPreviewData(4);
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
        <div className="grid gap-4">
          <AdminMemberPreview initialMembers={memberPreview.members} />
          <div>
            <Link href="/admin/members" className="inline-flex rounded-full bg-[#3c589e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f467e]">Open members</Link>
          </div>
        </div>

        <AdminRecentAuditPreview initialItems={recentAuditItems} />
      </section>
    </>
  );
}
