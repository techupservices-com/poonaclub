"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MemberCurrentValueConfirmCard } from "@/components/member/member-current-value-confirm-card";

export function EmailVerificationForm({
  initialEmail = "",
  verified = false,
  loginIdentifierType,
}: {
  initialEmail?: string;
  verified?: boolean;
  loginIdentifierType?: "mobile" | "email";
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showEditFlow, setShowEditFlow] = useState(false);
  const currentEmail = initialEmail.trim();

  const showReadOnlyCard = useMemo(() => {
    if (!currentEmail) return false;
    if (verified) return true;
    return loginIdentifierType === "mobile" && !showEditFlow;
  }, [currentEmail, loginIdentifierType, showEditFlow, verified]);

  const showConfirmButton = Boolean(currentEmail) && !verified && loginIdentifierType === "mobile" && !showEditFlow;

  async function confirmCurrentEmail() {
    setIsConfirming(true);
    setMessage(null);

    try {
      const response = await fetch("/api/member/email/confirm-current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to confirm current email address.");
        setIsConfirming(false);
        return;
      }

      router.refresh();
    } catch {
      setMessage("Unable to confirm current email address.");
      setIsConfirming(false);
    }
  }

  async function requestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/member/email/request-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const raw = await response.text();
      let payload: { requestId?: string; email?: string; previewCode?: string; error?: string } = {};

      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { error: "Unable to send email OTP. Please try again after some time." };
      }

      if (!response.ok) {
        setMessage(payload.error ?? "Unable to send email OTP.");
        return;
      }

      if (!payload.requestId) {
        setMessage("Unable to send email OTP. Please try again after some time.");
        return;
      }

      setRequestId(payload.requestId);
      setEmail(payload.email ?? email);
      setOtp(payload.previewCode ?? "");
    } finally {
      setIsSending(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId) return;
    setIsVerifying(true);
    setMessage(null);

    try {
      const response = await fetch("/api/member/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, otp }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to verify email OTP.");
        return;
      }

      setIsUpdating(true);
      if (response.ok) {
        setEmail("");
        router.refresh();
      }
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="grid gap-4">
      {showReadOnlyCard ? (
        <MemberCurrentValueConfirmCard
          label="email ID"
          value={currentEmail}
          instruction={
            showConfirmButton
              ? "Please click the Confirm button if you want to continue using the same email ID or click the Edit button if you want to change your email ID."
              : "Please click the Edit button if you want to change your email ID."
          }
          showConfirm={showConfirmButton}
          isConfirming={isConfirming}
          onConfirm={() => void confirmCurrentEmail()}
          onEdit={() => {
            setShowEditFlow(true);
            setRequestId(null);
            setOtp("");
            setEmail(currentEmail);
            setMessage(null);
          }}
        />
      ) : !requestId ? (
        <form onSubmit={requestOtp} className="soft-card rounded-[24px] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 1</p>
          <h3 className="mt-2 text-lg font-semibold">Enter your email address</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Enter the email address you want to verify for your member account.
          </p>
          <label className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
              required
            />
          </label>
          <button disabled={isSending} className="mt-4 rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60">
            {isSending ? "Sending email OTP..." : "Send email OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="soft-card rounded-[24px] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 2</p>
          <h3 className="mt-2 text-lg font-semibold">Verify email OTP</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Enter the 4-digit OTP sent to {email} to complete your email verification.
          </p>
          <label className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
            OTP code
            <input
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
              required
            />
          </label>
          <button disabled={isVerifying || isUpdating} className="mt-4 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-strong)] disabled:opacity-50">
            {isUpdating ? "Updating..." : isVerifying ? "Verifying email OTP..." : "Verify email OTP"}
          </button>
        </form>
      )}

      {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
