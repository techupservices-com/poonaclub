import { getMemberSession } from "@/lib/auth";
import { getMemberById } from "@/lib/data";
import { StatusChip } from "@/components/shared/status-chip";

export default async function MemberStatusPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  if (!member) return null;

  const items = [
    { label: "Unique mobile verified", done: member.verification.mobileVerified },
    { label: "Profile details completed", done: member.verification.profileConfirmed },
    { label: "Selfie uploaded", done: member.verification.selfieUploaded },
    { label: "Supporting document uploaded", done: member.verification.documentUploaded },
  ];

  return (
    <section className="soft-card rounded-[28px] p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Verification status</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Admin can review progress, but only the system can mark your account completed.</p>
        </div>
        <StatusChip label={member.verification.completed ? "Completed" : "Action needed"} tone={member.verification.completed ? "success" : "warning"} />
      </div>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 flex items-center justify-between gap-3">
            <p className="font-medium">{item.label}</p>
            <StatusChip label={item.done ? "Done" : "Pending"} tone={item.done ? "success" : "warning"} />
          </div>
        ))}
      </div>
    </section>
  );
}
