import { LinkedMemberManager } from "@/components/member/linked-member-manager";
import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers } from "@/lib/data";

export default async function LinkedMembersPage() {
  const session = await getMemberSession();
  const members = session ? await getLinkedMembers(session.subject) : [];

  return (
    <section className="grid gap-4">
      <div className="soft-card rounded-[28px] p-6">
        <h2 className="text-2xl font-semibold">Linked members on the same current mobile</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This screen is the cleanup workflow. Each linked member can be moved onto a unique mobile number and verified through their own WhatsApp OTP.</p>
      </div>
      <LinkedMemberManager members={members} />
    </section>
  );
}
