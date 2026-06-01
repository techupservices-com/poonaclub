import { AdminDocumentsQueue } from "@/components/admin/admin-documents-queue";
import { listMembersWithVerification } from "@/lib/data";

export default async function AdminDocumentsPage() {
  const members = await listMembersWithVerification();
  const pending = members.filter(
    (member) => !member.verification.selfieUploaded || !member.verification.documentUploaded,
  );

  const items = pending.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    membershipId: member.membershipId,
    selfieUploaded: member.verification.selfieUploaded,
    documentUploaded: member.verification.documentUploaded,
  }));

  return <AdminDocumentsQueue items={items} />;
}
