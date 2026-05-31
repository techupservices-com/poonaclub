import Link from "next/link";
import { getMemberSession } from "@/lib/auth";
import { getMemberById } from "@/lib/data";
import { StatusChip } from "@/components/shared/status-chip";

export default async function MemberStatusPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  if (!member) return null;

  const items = [
    { label: "Unique mobile verified", done: member.verification.mobileVerified, href: "/member/mobile", action: "Review mobile" },
    { label: "Profile details completed", done: member.verification.profileConfirmed, href: "/member/profile", action: member.verification.profileConfirmed ? "Review profile" : "Complete profile" },
    { label: "Selfie uploaded", done: member.verification.selfieUploaded, href: "/member/uploads", action: member.verification.selfieUploaded ? "Review uploads" : "Upload selfie" },
    { label: "Supporting document uploaded", done: member.verification.documentUploaded, href: "/member/uploads", action: member.verification.documentUploaded ? "Review uploads" : "Upload document" },
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
          <Link key={item.label} href={item.href} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 flex items-center justify-between gap-3 hover:border-[#6f84ba] hover:bg-[#eef2fb]/40">
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.action}</p>
            </div>
            <StatusChip label={item.done ? "Done" : "Pending"} tone={item.done ? "success" : "warning"} />
          </Link>
        ))}
      </div>
    </section>
  );
}
