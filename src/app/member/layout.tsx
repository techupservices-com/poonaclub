import { redirect } from "next/navigation";
import { StatusChip } from "@/components/shared/status-chip";
import { PortalShell } from "@/components/shared/portal-shell";
import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers, getMemberById } from "@/lib/data";

const nav: { href: string; label: string }[] = [];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getMemberSession();
  if (!session) redirect("/login/member");

  const member = await getMemberById(session.subject);
  if (!member) redirect("/login/member");

  const linkedMembers = await getLinkedMembers(member.id);
  const requiresLinkedMemberCleanup =
    linkedMembers.length > 1 && linkedMembers.some((entry) => !entry.mobileVerified);
  const totalSteps = requiresLinkedMemberCleanup ? 4 : 3;
  const completedSteps = [
    member.verification.mobileVerified,
    member.verification.profileConfirmed,
    member.verification.selfieUploaded && member.verification.documentUploaded,
    !requiresLinkedMemberCleanup,
  ].slice(0, totalSteps).filter(Boolean).length;
  const nextPendingStep = [
    !member.verification.mobileVerified ? "Verify your mobile number" : null,
    !member.verification.profileConfirmed ? "Complete your profile details" : null,
    !(member.verification.selfieUploaded && member.verification.documentUploaded)
      ? "Upload selfie and supporting document"
      : null,
    requiresLinkedMemberCleanup ? "Resolve shared family mobile numbers" : null,
  ].find(Boolean);
  const progressWidth = Math.max(8, (completedSteps / totalSteps) * 100);

  return (
    <PortalShell
      title="Member verification"
      subtitle="Complete the remaining steps below to finish your club verification. Each card tells you exactly what is done and what still needs your action."
      nav={nav}
      dashboardHref="/member"
      headerAside={
        <div className="w-full rounded-[26px] border border-[#d7e0f4] bg-white/95 px-5 py-5 shadow-sm lg:w-[420px] xl:w-[460px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">
                Verification progress
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {completedSteps}/{totalSteps}
              </p>
            </div>
            <StatusChip
              label={member.verification.completed ? "Verified" : "Pending"}
              tone={member.verification.completed ? "success" : "warning"}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {member.verification.completed
              ? "All required steps are complete. Your membership is verified."
              : nextPendingStep
                ? `Next step: ${nextPendingStep}`
                : "Complete the remaining pending steps below."}
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#dfe6f8]">
            <div
              className="h-full rounded-full bg-[#3c589e]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      }
    >
      {children}
    </PortalShell>
  );
}
