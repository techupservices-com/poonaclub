import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { getLinkedMembers, getMemberById, isMobileLoginOwner, listDocuments } from "@/lib/data";
import { formatDate, formatMobile } from "@/lib/utils";

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();
  const linkedMembers = await getLinkedMembers(id);
  const mobileOwner = await isMobileLoginOwner(member.id, member.currentMobile);

  const documents = (await listDocuments(id)).sort((left, right) => {
    const order = [
      "selfie:selfie",
      "aadhar:front",
      "aadhar:back",
      "passport:first_page",
      "passport:last_page",
      "legacy:legacy",
    ];
    return order.indexOf(`${left.documentGroup}:${left.documentPart}`) - order.indexOf(`${right.documentGroup}:${right.documentPart}`);
  });

  const getDocumentLabel = (document: (typeof documents)[number]) => {
    if (document.documentGroup === "selfie") return "Selfie";
    if (document.documentGroup === "aadhar" && document.documentPart === "front") return "Aadhar Front";
    if (document.documentGroup === "aadhar" && document.documentPart === "back") return "Aadhar Back";
    if (document.documentGroup === "passport" && document.documentPart === "first_page") return "Passport First Page";
    if (document.documentGroup === "passport" && document.documentPart === "last_page") return "Passport Last Page";
    return "Legacy document";
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} />
            <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member record</p>
            <h2 className="text-3xl font-semibold">{member.fullName}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
            </div>
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
        <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
          <p className="text-sm text-[var(--muted)]">Shared mobile ownership</p>
          <p className="mt-1 leading-7">
            {linkedMembers.length > 1
              ? mobileOwner
                ? "This member is currently the active login owner for the shared mobile number."
                : "This member shares the mobile number with other records and still needs a unique verified number."
              : "This mobile number is not currently shared with other member records."}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/admin/members/${member.id}/edit`} className="inline-flex rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-strong)]">Edit member</Link>
          <Link href="/admin/members" className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">Back to directory</Link>
        </div>
      </div>

      <div className="soft-card rounded-[28px] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Verification review</p>
        <h3 className="mt-2 text-xl font-semibold">Documents and checklist</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This panel shows what the system has marked complete and what is still missing for full verification.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatusChip label={member.verification.mobileVerified ? "Mobile verified" : "Mobile pending"} tone={member.verification.mobileVerified ? "success" : "warning"} />
          <StatusChip label={member.verification.emailVerified ? "Email verified" : "Email pending"} tone={member.verification.emailVerified ? "success" : "warning"} />
          <StatusChip label={member.verification.profileConfirmed ? "Profile complete" : "Profile incomplete"} tone={member.verification.profileConfirmed ? "success" : "warning"} />
          <StatusChip label={member.verification.selfieUploaded ? "Selfie uploaded" : "Selfie missing"} tone={member.verification.selfieUploaded ? "success" : "warning"} />
          <StatusChip label={member.verification.documentUploaded ? "Document uploaded" : "Document missing"} tone={member.verification.documentUploaded ? "success" : "warning"} />
        </div>
        <div className="mt-6 space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="font-medium">{getDocumentLabel(document)}</p>
              <p className="text-sm text-[var(--muted)]">{document.fileName}</p>
            </div>
          ))}
          {documents.length === 0 ? <p className="text-sm text-[var(--muted)]">No uploads available.</p> : null}
        </div>
      </div>
    </section>
  );
}
