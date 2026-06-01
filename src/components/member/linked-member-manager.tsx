"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberWithVerification } from "@/lib/types";
import { formatMobile } from "@/lib/utils";
import { StatusChip } from "@/components/shared/status-chip";

export function LinkedMemberManager({ members }: { members: MemberWithVerification[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [assigningProfileId, setAssigningProfileId] = useState<string | null>(null);
  const [verifyingProfileId, setVerifyingProfileId] = useState<string | null>(null);
  const [draftMobiles, setDraftMobiles] = useState<Record<string, string>>({});
  const [pendingRequests, setPendingRequests] = useState<
    Record<string, { requestId: string; mobile: string; previewCode?: string; otp: string }>
  >({});

  async function onAssign(profileId: string) {
    setAssigningProfileId(profileId);
    const mobile = draftMobiles[profileId] ?? "";
    try {
      const response = await fetch(`/api/member/linked-members/${profileId}/assign-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newMobile: mobile }),
      });
      const payload = await response.json();
      if (response.ok) {
        setPendingRequests((current) => ({
          ...current,
          [profileId]: {
            requestId: payload.requestId,
            mobile: payload.mobile,
            previewCode: payload.previewCode,
            otp: payload.previewCode ?? "",
          },
        }));
        setDraftMobiles((current) => ({
          ...current,
          [profileId]: payload.mobile,
        }));
      }
      setMessages((current) => ({
        ...current,
        [profileId]: response.ok
          ? `${payload.message}${payload.previewCode ? ` Demo OTP: ${payload.previewCode}` : ""}`
          : payload.error,
      }));
    } finally {
      setAssigningProfileId(null);
    }
  }

  async function verifyLinkedMember(profileId: string) {
    const request = pendingRequests[profileId];
    if (!request) return;
    setVerifyingProfileId(profileId);

    try {
      const response = await fetch("/api/member/linked-members/verify-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, otp: request.otp }),
      });
      const payload = await response.json();

      setMessages((current) => ({
        ...current,
        [profileId]: response.ok ? payload.message : payload.error,
      }));

      if (response.ok) {
        setPendingRequests((current) => {
          const next = { ...current };
          delete next[profileId];
          return next;
        });
        setDraftMobiles((current) => {
          const next = { ...current };
          delete next[profileId];
          return next;
        });
        router.refresh();
      }
    } finally {
      setVerifyingProfileId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {members.map((member) => (
        <div key={member.id} className="soft-card rounded-[24px] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{member.fullName}</h3>
                <StatusChip label={member.mobileVerified ? "Verified" : "Action needed"} tone={member.mobileVerified ? "success" : "warning"} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {member.membershipId} · {formatMobile(member.currentMobile)}
              </p>
            </div>
            {!member.mobileVerified ? (
              <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
                Assign a unique number for this household member. They will receive their own WhatsApp verification OTP.
              </p>
            ) : (
              <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
                This member already has a verified number, so no more action is needed here.
              </p>
            )}
          </div>

          {!member.mobileVerified ? (
            <form
              className="mt-4 grid gap-3 rounded-[22px] border border-[var(--border)] bg-white px-4 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                void onAssign(member.id);
              }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#3c589e]">Step 1</p>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  name="newMobile"
                  value={draftMobiles[member.id] ?? ""}
                  onChange={(event) =>
                    setDraftMobiles((current) => ({
                      ...current,
                      [member.id]: event.target.value,
                    }))
                  }
                  placeholder="Enter new mobile number"
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
                  disabled={Boolean(pendingRequests[member.id]) || assigningProfileId === member.id}
                  required
                />
                <button
                  disabled={assigningProfileId === member.id || Boolean(pendingRequests[member.id])}
                  className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60"
                >
                  {assigningProfileId === member.id ? "Sending OTP..." : "Send member OTP"}
                </button>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Enter the new number here first. Once you send the OTP, Step 2 will appear below for verification.
              </p>
            </form>
          ) : null}

          {messages[member.id] ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{messages[member.id]}</p>
          ) : null}

          {pendingRequests[member.id] ? (
            <div className="mt-4 rounded-[22px] border border-[#d7e0f4] bg-[#eef2fb]/60 px-4 py-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#3c589e]">Step 2</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                Verify OTP sent to {formatMobile(pendingRequests[member.id].mobile)}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Ask the linked member for the 6-digit WhatsApp OTP and enter it below to activate the new number.
              </p>
              {pendingRequests[member.id].previewCode ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Demo OTP: {pendingRequests[member.id].previewCode}
                </p>
              ) : null}
              <div className="mt-3 flex flex-col gap-3 md:flex-row">
                <input
                  value={pendingRequests[member.id].otp}
                  onChange={(event) =>
                    setPendingRequests((current) => ({
                      ...current,
                      [member.id]: {
                        ...current[member.id],
                        otp: event.target.value,
                      },
                    }))
                  }
                  placeholder="Enter 6-digit OTP"
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
                />
                <button
                  type="button"
                  disabled={verifyingProfileId === member.id}
                  onClick={() => void verifyLinkedMember(member.id)}
                  className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60"
                >
                  {verifyingProfileId === member.id ? "Verifying..." : "Verify member OTP"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
