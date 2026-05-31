import { ProfileForm } from "@/components/member/profile-form";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberSession } from "@/lib/auth";
import { getMemberById } from "@/lib/data";

export default async function MemberProfilePage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  if (!member) return null;

  return (
    <section className="grid gap-4">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Profile step</p>
            <h2 className="mt-2 text-2xl font-semibold">Complete your address and contact details</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This step is complete when your email, address, city, and pincode are all present and correct.</p>
          </div>
          <StatusChip label={member.verification.profileConfirmed ? "Completed" : "Pending"} tone={member.verification.profileConfirmed ? "success" : "warning"} />
        </div>
      </div>
      <div className="soft-card rounded-[28px] p-6">
        <ProfileForm member={member} />
      </div>
    </section>
  );
}
