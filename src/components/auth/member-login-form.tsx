"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberLoginForm({ initialIdentifier = "" }: { initialIdentifier?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/member/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const payload = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Unable to send OTP.");
      return;
    }

    const query = new URLSearchParams({
      identifier,
      profileId: payload.profileId,
      mobile: payload.mobile,
    });

    if (payload.previewCode) {
      query.set("previewCode", payload.previewCode);
    }

    router.push(`/login/member/verify?${query.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
          Membership ID or registered mobile number
        </label>
        <input
          id="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="T295 or 9604420719"
          className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--foreground)] shadow-sm focus:border-[#6f84ba]"
          required
        />
      </div>

      {error ? <p className="text-sm text-[#3c589e]">{error}</p> : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60"
      >
        {isLoading ? "Sending WhatsApp OTP..." : "Send WhatsApp OTP"}
      </button>
    </form>
  );
}
