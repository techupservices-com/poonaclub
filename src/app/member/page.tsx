import { Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers, getMemberById, getMemberProfilePhotoUrl, isMobileLoginOwner, listDocuments } from "@/lib/data";
import { formatMobile } from "@/lib/utils";
import { StatusChip } from "@/components/shared/status-chip";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;

  if (!member) return null;

  const linkedMembers = await getLinkedMembers(member.id);
  const documents = await listDocuments(member.id);
  const orderedDocuments = [...documents].sort((left, right) => {
    if (left.documentType === right.documentType) return 0;
    return left.documentType === "selfie" ? -1 : 1;
  });
  const profilePhotoUrl = await getMemberProfilePhotoUrl(member.id, member.photoUrl);
  const requiresLinkedMemberCleanup =
    linkedMembers.length > 1 && linkedMembers.some((entry) => !entry.mobileVerified);
  const mobileOwner = await isMobileLoginOwner(member.id, member.currentMobile);

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
      key: "email",
      href: "/member/email",
      title: "Email address verified",
      description: "Verify your email address with an OTP so your voting record and future notifications stay secure.",
      done: member.verification.emailVerified,
      cta: member.verification.emailVerified ? "Review email" : "Verify email",
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

  return (
    <>
      <section className="grid gap-4">
        <div className="soft-card rounded-[30px] p-5 md:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member record</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)] md:text-4xl">
                  {member.fullName}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[128px_1fr] sm:items-start lg:grid-cols-[170px_1fr]">
              <Link
                href="/member/uploads"
                className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[28px] border border-[var(--border)] bg-[#eef2fb] shadow-sm sm:aspect-[4/5] lg:max-h-[236px]"
              >
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt={`${member.fullName} profile`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-[#3c589e]">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm sm:h-16 sm:w-16">
                      <Camera className="h-8 w-8" />
                    </span>
                    <span className="text-sm font-semibold tracking-[0.01em]">Set profile photo</span>
                  </div>
                )}
                <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/92 px-3 py-2 text-center text-[11px] font-semibold text-[#24345f] shadow-sm transition group-hover:bg-white sm:inset-x-3 sm:bottom-3 sm:text-xs">
                  {profilePhotoUrl ? "Change photo" : "Upload selfie"}
                </span>
              </Link>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 md:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Registered mobile</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)] md:text-lg">{formatMobile(member.currentMobile)}</p>
                  {linkedMembers.length > 1 ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      {mobileOwner
                        ? "This profile is currently the login owner for the shared family mobile number."
                        : "This mobile number is shared and still needs ownership cleanup."}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 md:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Email</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)] md:text-lg">{member.email || "Not added yet"}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 md:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">Address</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">{member.address1 || "Not added"}</p>
                  {member.address2 ? <p className="text-sm leading-7 text-[var(--foreground)]">{member.address2}</p> : null}
                  {member.address3 ? <p className="text-sm leading-7 text-[var(--foreground)]">{member.address3}</p> : null}
                </div>
                <div className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4 md:px-5">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">City / Pincode</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)] md:text-lg">{member.city || "-"} {member.pincode || ""}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {steps.map((step, index) => (
          <Link
            key={step.key}
            href={step.href}
            className="soft-card rounded-[28px] p-6 hover:border-[#6f84ba] hover:bg-[#eef2fb]/40"
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

        {orderedDocuments.length ? (
          <div className="soft-card rounded-[28px] p-6">
            <h3 className="text-xl font-semibold">Uploaded documents</h3>
            <div className="mt-4 grid gap-3">
              {orderedDocuments.map((document) => (
                <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
                  <p className="font-medium capitalize">{document.documentType}</p>
                  <p className="text-sm text-[var(--muted)]">{document.fileName}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
