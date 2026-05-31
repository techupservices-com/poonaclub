import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberById, listDocuments } from "@/lib/data";
import { formatDate, formatMobile } from "@/lib/utils";

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const documents = await listDocuments(id);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">{member.fullName}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
          </div>
          <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4"><p className="text-sm text-[var(--muted)]">Mobile</p><p className="mt-1 font-medium">{formatMobile(member.currentMobile)}</p></div>
          <div className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4"><p className="text-sm text-[var(--muted)]">Email</p><p className="mt-1 font-medium">{member.email}</p></div>
          <div className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4"><p className="text-sm text-[var(--muted)]">Date of birth</p><p className="mt-1 font-medium">{formatDate(member.dateOfBirth)}</p></div>
          <div className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4"><p className="text-sm text-[var(--muted)]">Joined</p><p className="mt-1 font-medium">{formatDate(member.joinedAt)}</p></div>
        </div>
        <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
          <p className="text-sm text-[var(--muted)]">Address</p>
          <p className="mt-1 leading-7">{member.address1}, {member.address2}, {member.address3}, {member.city} {member.pincode}</p>
        </div>
        <Link href={`/admin/members/${member.id}/edit`} className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-strong)]">Edit member</Link>
      </div>

      <div className="soft-card rounded-[28px] p-6">
        <h3 className="text-xl font-semibold">Documents and checklist</h3>
        <div className="mt-4 space-y-3">
          <StatusChip label={member.verification.mobileVerified ? "Mobile verified" : "Mobile pending"} tone={member.verification.mobileVerified ? "success" : "warning"} />
          <StatusChip label={member.verification.profileConfirmed ? "Profile complete" : "Profile incomplete"} tone={member.verification.profileConfirmed ? "success" : "warning"} />
          <StatusChip label={member.verification.selfieUploaded ? "Selfie uploaded" : "Selfie missing"} tone={member.verification.selfieUploaded ? "success" : "warning"} />
          <StatusChip label={member.verification.documentUploaded ? "Document uploaded" : "Document missing"} tone={member.verification.documentUploaded ? "success" : "warning"} />
        </div>
        <div className="mt-6 space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="font-medium capitalize">{document.documentType}</p>
              <p className="text-sm text-[var(--muted)]">{document.fileName}</p>
            </div>
          ))}
          {documents.length === 0 ? <p className="text-sm text-[var(--muted)]">No uploads available.</p> : null}
        </div>
      </div>
    </section>
  );
}
