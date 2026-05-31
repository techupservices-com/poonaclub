import { ProfileForm } from "@/components/member/profile-form";
import { getMemberSession } from "@/lib/auth";
import { getMemberById } from "@/lib/data";

export default async function MemberProfilePage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  if (!member) return null;

  return (
    <section className="soft-card rounded-[28px] p-6">
      <h2 className="text-2xl font-semibold">Update your profile</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Address and email changes are tracked immediately. Verification status updates automatically when required fields are complete.</p>
      <div className="mt-6">
        <ProfileForm member={member} />
      </div>
    </section>
  );
}
