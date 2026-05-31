"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OTP_RESEND_SECONDS } from "@/lib/constants";
import { formatMobile } from "@/lib/utils";

export function MemberOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState(searchParams.get("previewCode") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
  const [previewCode, setPreviewCode] = useState(searchParams.get("previewCode") ?? "");
  const [profileId, setProfileId] = useState(searchParams.get("profileId") ?? "");
  const [mobile, setMobile] = useState(searchParams.get("mobile") ?? "");
  const identifier = searchParams.get("identifier") ?? "";

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  async function onResendOtp() {
    setError(null);
    setIsResending(true);

    const response = await fetch("/api/member/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const payload = await response.json();
    setIsResending(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to resend OTP.");
      return;
    }

    setProfileId(payload.profileId);
    setMobile(payload.mobile);
    setPreviewCode(payload.previewCode ?? "");
    setOtp(payload.previewCode ?? "");
    setSecondsLeft(OTP_RESEND_SECONDS);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/member/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, identifier, otp }),
    });
    const payload = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "OTP verification failed.");
      return;
    }

    router.push("/member");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-[22px] border border-[var(--border)] bg-[#eef2fb]/70 px-4 py-4 text-sm leading-6 text-[#24345f]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Sending OTP to</span>
            <p className="mt-2 text-lg font-semibold">{formatMobile(mobile || identifier)}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/login/member?identifier=${encodeURIComponent(identifier)}`)}
            className="rounded-full border border-[#b9c8ea] bg-white px-4 py-2 text-sm font-semibold text-[#3c589e] hover:border-[#6f84ba] hover:bg-[#dfe6f8]"
          >
            Edit
          </button>
        </div>
      </div>

      {previewCode ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
          Demo mode preview code: <span className="font-mono font-semibold tracking-[0.2em]">{previewCode}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="otp" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          OTP code
        </label>
        <input
          id="otp"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="6 digit code"
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-base tracking-[0.35em] text-[var(--foreground)] shadow-sm focus:border-[#6f84ba] md:px-5 md:py-4 md:text-lg"
          required
        />
      </div>

      {error ? <p className="text-sm text-[#3c589e]">{error}</p> : null}

      <div className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm text-[var(--muted)]">
        {secondsLeft > 0 ? (
          <p>Resend OTP available in {secondsLeft}s</p>
        ) : (
          <button
            type="button"
            onClick={onResendOtp}
            disabled={isResending}
            className="font-semibold text-[#3c589e] hover:text-[#2f467e] disabled:opacity-60"
          >
            {isResending ? "Resending OTP..." : "Resend OTP"}
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60"
      >
        {isLoading ? "Verifying..." : "Verify and continue"}
      </button>
    </form>
  );
}
