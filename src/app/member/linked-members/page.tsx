import { LinkedMemberManager } from "@/components/member/linked-member-manager";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers } from "@/lib/data";

export default async function LinkedMembersPage() {
  const session = await getMemberSession();
  const members = session ? await getLinkedMembers(session.subject) : [];
  const needsCleanup = members.length > 1 && members.some((member) => !member.mobileVerified);

  return (
    <section className="grid gap-4">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Shared-number cleanup</p>
            <h2 className="mt-2 text-2xl font-semibold">Linked members on the same current mobile</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Only use this page if multiple family members still share one mobile number. Each pending member should be given their own number here.</p>
          </div>
          <StatusChip label={needsCleanup ? "Action needed" : "No pending cleanup"} tone={needsCleanup ? "warning" : "success"} />
        </div>
      </div>
      <LinkedMemberManager members={members} />
    </section>
  );
}
