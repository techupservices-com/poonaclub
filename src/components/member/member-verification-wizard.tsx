"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { EmailVerificationForm } from "@/components/member/email-verification-form";
import { LinkedMemberManager } from "@/components/member/linked-member-manager";
import { MemberSelfieUploader } from "@/components/member/member-selfie-uploader";
import { MobileChangeForm } from "@/components/member/mobile-change-form";
import { StatusChip } from "@/components/shared/status-chip";
import { VerificationCompleteModal } from "@/components/member/verification-complete-modal";
import type { MemberWithVerification } from "@/lib/types";

type StepKey = "mobile" | "email" | "uploads" | "linked-members";

const COMPLETE_MODAL_KEY = "pc-member-verification-complete";

export function MemberVerificationWizard({
  member,
  linkedMembers,
  requiresLinkedMemberCleanup,
  selfieItem,
  selfieUploaded,
}: {
  member: MemberWithVerification;
  linkedMembers: MemberWithVerification[];
  requiresLinkedMemberCleanup: boolean;
  selfieItem: { id: string; fileName: string; previewUrl: string | null } | null;
  selfieUploaded: boolean;
}) {
  const steps = useMemo(
    () =>
      [
        {
          key: "mobile" as const,
          title: "Mobile number verification / change",
          description: "Verify or change the registered mobile number for this account.",
          done: member.verification.mobileVerified,
          render: (
            <MobileChangeForm
              initialMobile={member.currentMobile}
              verified={member.verification.mobileVerified}
            />
          ),
        },
        {
          key: "email" as const,
          title: "Email ID verification / change",
          description: "Verify or update the email address attached to this member profile.",
          done: member.verification.emailVerified,
          render: <EmailVerificationForm initialEmail={member.email} verified={member.verification.emailVerified} />,
        },
        {
          key: "uploads" as const,
          title: "Selfie upload / replace",
          description: "Upload or replace your selfie to complete this verification step.",
          done: member.verification.selfieUploaded,
          render: <MemberSelfieUploader photoUrl={selfieItem?.previewUrl ?? null} hasSelfie={selfieUploaded} variant="panel" />,
        },
        ...(requiresLinkedMemberCleanup
          ? [
              {
                key: "linked-members" as const,
                title: "Family members updation",
                description: "Move shared-number family records to their own verified mobile numbers.",
                done: false,
                render: <LinkedMemberManager members={linkedMembers} />,
              },
            ]
          : []),
      ],
    [
      linkedMembers,
      member.email,
      member.currentMobile,
      member.verification.emailVerified,
      member.verification.mobileVerified,
      member.verification.selfieUploaded,
      requiresLinkedMemberCleanup,
      selfieItem,
      selfieUploaded,
    ],
  );

  const firstPendingKey = steps.find((step) => !step.done)?.key ?? null;
  const allComplete = steps.every((step) => step.done);
  const [openStep, setOpenStep] = useState<StepKey | null>(firstPendingKey);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    const storageKey = `${COMPLETE_MODAL_KEY}-${member.id}`;
    if (allComplete) {
      if (window.sessionStorage.getItem(storageKey) !== "shown") {
        window.requestAnimationFrame(() => {
          setShowCompleteModal(true);
          window.sessionStorage.setItem(storageKey, "shown");
        });
      }
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [allComplete, member.id]);

  return (
    <>
      <section className="grid gap-4">
        {steps.map((step, index) => {
          const expanded = openStep === step.key;

          return (
            <div key={step.key} className="soft-card overflow-hidden rounded-[28px]">
              <button
                type="button"
                onClick={() => setOpenStep((current) => (current === step.key ? null : step.key))}
                className="flex w-full flex-col gap-4 p-6 text-left hover:bg-[#eef2fb]/35 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {step.done ? "Done" : `${index + 1}`}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-[var(--foreground)]">{step.title}</h3>
                      <StatusChip label={step.done ? "Completed" : "Pending"} tone={step.done ? "success" : "warning"} />
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--muted)] transition ${expanded ? "rotate-180" : "rotate-0"}`} />
              </button>

              {expanded ? <div className="border-t border-[var(--border)] px-4 py-4 md:px-6 md:py-6">{step.render}</div> : null}
            </div>
          );
        })}
      </section>

      <VerificationCompleteModal open={showCompleteModal} onClose={() => setShowCompleteModal(false)} />
    </>
  );
}
