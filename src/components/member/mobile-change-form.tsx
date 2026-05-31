"use client";

import { useState } from "react";

export function MobileChangeForm() {
  const [newMobile, setNewMobile] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function requestChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Sending OTP...");
    const response = await fetch("/api/member/mobile/request-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newMobile }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to send OTP.");
      return;
    }
    setRequestId(payload.requestId);
    setOtp(payload.previewCode ?? "");
    setMessage(`OTP sent to ${payload.mobile}.`);
  }

  async function verifyChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Verifying OTP...");
    const response = await fetch("/api/member/mobile/verify-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, otp }),
    });
    const payload = await response.json();
    setMessage(response.ok ? payload.message : payload.error);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={requestChange} className="soft-card rounded-[24px] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 1</p>
        <h3 className="mt-2 text-lg font-semibold">Request a new personal mobile number</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          The new number stays pending until its WhatsApp OTP is verified.
        </p>
        <label className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
          New mobile number
          <input value={newMobile} onChange={(e) => setNewMobile(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        </label>
        <button className="mt-4 rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">Send OTP</button>
      </form>

      <form onSubmit={verifyChange} className="soft-card rounded-[24px] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Step 2</p>
        <h3 className="mt-2 text-lg font-semibold">Verify new number</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Enter the OTP received on the new mobile number to activate it.
        </p>
        <label className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
          OTP code
          <input value={otp} onChange={(e) => setOtp(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        </label>
        <button disabled={!requestId} className="mt-4 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-strong)] disabled:opacity-50">Verify mobile</button>
      </form>

      <p className="text-sm text-[var(--muted)] lg:col-span-2">{message ?? "If you do not need to change your number, you can return to the member homepage."}</p>
    </div>
  );
}
