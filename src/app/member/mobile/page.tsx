import { MobileChangeForm } from "@/components/member/mobile-change-form";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberSession } from "@/lib/auth";
import { getMemberById } from "@/lib/data";

export default async function MemberMobilePage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;

  return (
    <section className="grid gap-4">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Mobile step</p>
            <h2 className="mt-2 text-2xl font-semibold">Manage your mobile number</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Your first login OTP already confirms the current number. Use this page only if you need to change it.</p>
          </div>
          <StatusChip label={member?.verification.mobileVerified ? "Completed" : "Pending"} tone={member?.verification.mobileVerified ? "success" : "warning"} />
        </div>
      </div>
      <MobileChangeForm />
    </section>
  );
}
