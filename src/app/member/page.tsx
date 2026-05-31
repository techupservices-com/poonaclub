import Link from "next/link";
import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers, getMemberById, listDocuments } from "@/lib/data";
import { formatMobile } from "@/lib/utils";
import { StatusChip } from "@/components/shared/status-chip";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;

  if (!member) return null;

  const linkedMembers = await getLinkedMembers(member.id);
  const documents = await listDocuments(member.id);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="soft-card rounded-[28px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{member.fullName}</h2>
                <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{member.address1}, {member.address2}, {member.address3}, {member.city} {member.pincode}</p>
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
              <p className="font-medium">Current registered mobile</p>
              <p className="mt-1 text-lg font-semibold">{formatMobile(member.currentMobile)}</p>
            </div>
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Verification checklist</p>
          <div className="mt-4 grid gap-3">
            <StatusChip label={member.verification.mobileVerified ? "Mobile verified" : "Verify mobile"} tone={member.verification.mobileVerified ? "success" : "warning"} />
            <StatusChip label={member.verification.profileConfirmed ? "Profile updated" : "Update profile"} tone={member.verification.profileConfirmed ? "success" : "warning"} />
            <StatusChip label={member.verification.selfieUploaded ? "Selfie uploaded" : "Upload selfie"} tone={member.verification.selfieUploaded ? "success" : "warning"} />
            <StatusChip label={member.verification.documentUploaded ? "Document uploaded" : "Upload document"} tone={member.verification.documentUploaded ? "success" : "warning"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/member/profile" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-rose-300 hover:bg-rose-50">Profile</Link>
            <Link href="/member/uploads" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-rose-300 hover:bg-rose-50">Uploads</Link>
            <Link href="/member/linked-members" className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-rose-300 hover:bg-rose-50">Linked members</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Household members sharing this number</h3>
          <div className="mt-4 space-y-3">
            {linkedMembers.map((entry) => (
              <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{entry.fullName}</p>
                    <p className="text-sm text-[var(--muted)]">{entry.membershipId} · {formatMobile(entry.currentMobile)}</p>
                  </div>
                  <StatusChip label={entry.mobileVerified ? "Own number verified" : "Needs unique number"} tone={entry.mobileVerified ? "success" : "warning"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Uploads on file</h3>
          <div className="mt-4 space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
                <p className="font-medium capitalize">{document.documentType}</p>
                <p className="text-sm text-[var(--muted)]">{document.fileName}</p>
              </div>
            ))}
            {documents.length === 0 ? <p className="text-sm text-[var(--muted)]">No files uploaded yet.</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
