import { getMemberSession } from "@/lib/auth";
import { getLinkedMembers, getMemberById, getMemberProfilePhotoUrl, isMobileLoginOwner, listDocuments } from "@/lib/data";
import { MemberSelfieUploader } from "@/components/member/member-selfie-uploader";
import { MemberVerificationWizard } from "@/components/member/member-verification-wizard";
import { formatMobile } from "@/lib/utils";

export default async function MemberDashboardPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;

  if (!member) return null;

  const linkedMembers = await getLinkedMembers(member.id);
  const documents = await listDocuments(member.id);
  const profilePhotoUrl = await getMemberProfilePhotoUrl(member.id, member.photoUrl);
  const selfieDocument = documents.find((document) => document.documentGroup === "selfie") ?? null;
  const selfieItem = profilePhotoUrl
    ? {
        id: selfieDocument?.id ?? "profile-photo",
        fileName: selfieDocument?.fileName ?? "Current selfie",
        previewUrl: profilePhotoUrl,
      }
    : null;
  const requiresLinkedMemberCleanup =
    linkedMembers.length > 1 && linkedMembers.some((entry) => !entry.mobileVerified);
  const mobileOwner = await isMobileLoginOwner(member.id, member.currentMobile);

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
              <MemberSelfieUploader
                photoUrl={profilePhotoUrl}
                hasSelfie={documents.some((document) => document.documentGroup === "selfie")}
              />

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

      <MemberVerificationWizard
        key={`${member.id}-${member.verification.mobileVerified}-${member.verification.emailVerified}-${member.verification.selfieUploaded}-${requiresLinkedMemberCleanup}-${linkedMembers.filter((entry) => !entry.mobileVerified).length}`}
        member={member}
        linkedMembers={linkedMembers}
        requiresLinkedMemberCleanup={requiresLinkedMemberCleanup}
        selfieItem={selfieItem}
        selfieUploaded={documents.some((document) => document.documentGroup === "selfie")}
      />

    </>
  );
}
