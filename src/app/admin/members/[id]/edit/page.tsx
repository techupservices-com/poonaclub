import { notFound } from "next/navigation";
import { AdminMemberForm } from "@/components/admin/admin-member-form";
import { getMemberById } from "@/lib/data";

export default async function AdminMemberEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Edit member details</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Admin may correct data fields, but verification status remains fully system-driven.</p>
      <div className="mt-6">
        <AdminMemberForm member={member} />
      </div>
    </section>
  );
}
