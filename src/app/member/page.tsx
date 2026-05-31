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
  const requiresLinkedMemberCleanup =
    linkedMembers.length > 1 && linkedMembers.some((entry) => !entry.mobileVerified);

  const steps = [
    {
      key: "mobile",
      href: "/member/mobile",
      title: "Mobile number verified",
      description: "Your WhatsApp login OTP confirms the registered mobile number for this account.",
      done: member.verification.mobileVerified,
      cta: member.verification.mobileVerified ? "Review mobile" : "Verify mobile",
    },
    {
      key: "profile",
      href: "/member/profile",
      title: "Complete your profile details",
      description: "Check your email and address details so your member record is complete.",
      done: member.verification.profileConfirmed,
      cta: member.verification.profileConfirmed ? "Review details" : "Complete profile",
    },
    {
      key: "uploads",
      href: "/member/uploads",
      title: "Upload selfie and supporting document",
      description: "Upload your latest selfie and one identity/supporting document to finish document verification.",
      done: member.verification.selfieUploaded && member.verification.documentUploaded,
      cta:
        member.verification.selfieUploaded && member.verification.documentUploaded
          ? "Review uploads"
          : "Upload files",
    },
    ...(requiresLinkedMemberCleanup
      ? [
          {
            key: "linked-members",
            href: "/member/linked-members",
            title: "Separate shared family mobile numbers",
            description: "Some family members still share this mobile number. Give them their own numbers to finish cleanup.",
            done: false,
            cta: "Resolve shared numbers",
          },
        ]
      : []),
  ];

  const completedSteps = steps.filter((step) => step.done).length;
  const nextPendingStep = steps.find((step) => !step.done);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="soft-card rounded-[28px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{member.fullName}</h2>
                <StatusChip label={member.verification.completed ? "Membership verified" : "Action needed"} tone={member.verification.completed ? "success" : "warning"} />
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Follow the steps below one by one. Completed steps are clearly marked, and incomplete steps take you straight to the page where you can finish them.
              </p>
            </div>
            <div className="rounded-[24px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
              <p className="font-medium">Registered mobile</p>
              <p className="mt-1 text-lg font-semibold">{formatMobile(member.currentMobile)}</p>
            </div>
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-rose-700">Verification progress</p>
          <p className="mt-3 text-4xl font-semibold">{completedSteps}/{steps.length}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {member.verification.completed
              ? "All required steps are complete. Your membership is verified."
              : nextPendingStep
                ? `Next step: ${nextPendingStep.title}`
                : "Review your details below."}
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full rounded-full bg-rose-600"
              style={{ width: `${Math.max(8, (completedSteps / steps.length) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {steps.map((step, index) => (
          <Link
            key={step.key}
            href={step.href}
            className="soft-card rounded-[28px] p-6 hover:border-rose-300 hover:bg-rose-50/40"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {step.done ? "Done" : `${index + 1}`}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <StatusChip label={step.done ? "Completed" : "Pending"} tone={step.done ? "success" : "warning"} />
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                </div>
              </div>
              <span className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)]">
                {step.cta}
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Your details on record</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
            <p><span className="font-medium text-[var(--foreground)]">Email:</span> {member.email || "Not added yet"}</p>
            <p><span className="font-medium text-[var(--foreground)]">Address:</span> {member.address1}, {member.address2}, {member.address3}, {member.city} {member.pincode}</p>
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Household number check</h3>
          <div className="mt-4 space-y-3">
            {linkedMembers.map((entry) => (
              <div key={entry.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{entry.fullName}</p>
                    <p className="text-sm text-[var(--muted)]">{entry.membershipId} · {formatMobile(entry.currentMobile)}</p>
                  </div>
                  <StatusChip label={entry.mobileVerified ? "Unique number verified" : "Still needs action"} tone={entry.mobileVerified ? "success" : "warning"} />
                </div>
              </div>
            ))}
            {linkedMembers.length <= 1 ? (
              <p className="text-sm text-[var(--muted)]">No other members currently share this mobile number.</p>
            ) : null}
          </div>
        </div>
      </section>

      {documents.length ? (
        <section className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Uploaded documents</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {documents.map((document) => (
              <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
                <p className="font-medium capitalize">{document.documentType}</p>
                <p className="text-sm text-[var(--muted)]">{document.fileName}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
