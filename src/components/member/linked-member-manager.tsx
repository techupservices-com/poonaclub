"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberWithVerification } from "@/lib/types";
import { formatMobile } from "@/lib/utils";
import { StatusChip } from "@/components/shared/status-chip";

export function LinkedMemberManager({ members }: { members: MemberWithVerification[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pendingRequests, setPendingRequests] = useState<
    Record<string, { requestId: string; mobile: string; previewCode?: string; otp: string }>
  >({});

  async function onAssign(profileId: string, formData: FormData) {
    const mobile = String(formData.get("newMobile") ?? "");
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
    }
    setMessages((current) => ({
      ...current,
      [profileId]: response.ok
        ? `${payload.message}${payload.previewCode ? ` Demo OTP: ${payload.previewCode}` : ""}`
        : payload.error,
    }));
  }

  async function verifyLinkedMember(profileId: string) {
    const request = pendingRequests[profileId];
    if (!request) return;

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
      router.refresh();
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
              className="mt-4 flex flex-col gap-3 md:flex-row"
              action={(formData) => {
                void onAssign(member.id, formData);
              }}
            >
              <input
                name="newMobile"
                placeholder="Enter new mobile number"
                className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
                required
              />
              <button className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">
                Send member OTP
              </button>
            </form>
          ) : null}

          {messages[member.id] ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{messages[member.id]}</p>
          ) : null}

          {pendingRequests[member.id] ? (
            <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Verify OTP sent to {formatMobile(pendingRequests[member.id].mobile)}
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
                  onClick={() => void verifyLinkedMember(member.id)}
                  className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]"
                >
                  Verify member OTP
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
