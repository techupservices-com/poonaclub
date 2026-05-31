import { listMembersWithVerification } from "@/lib/data";

export default async function AdminDocumentsPage() {
  const members = await listMembersWithVerification();
  const pending = members.filter(
    (member) => !member.verification.selfieUploaded || !member.verification.documentUploaded,
  );

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Document review queue</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This queue helps the admin review which members still need selfie or supporting document uploads.</p>
      <div className="mt-6 grid gap-3">
        {pending.map((member) => (
          <div key={member.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
            <p className="font-medium">{member.fullName}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · Selfie: {member.verification.selfieUploaded ? "Yes" : "No"} · Document: {member.verification.documentUploaded ? "Yes" : "No"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
