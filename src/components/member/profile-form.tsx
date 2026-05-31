"use client";

import { useState } from "react";
import type { MemberWithVerification } from "@/lib/types";

export function ProfileForm({ member }: { member: MemberWithVerification }) {
  const [email, setEmail] = useState(member.email);
  const [address1, setAddress1] = useState(member.address1);
  const [address2, setAddress2] = useState(member.address2);
  const [address3, setAddress3] = useState(member.address3);
  const [city, setCity] = useState(member.city);
  const [pincode, setPincode] = useState(member.pincode);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    const response = await fetch("/api/member/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, address1, address2, address3, city, pincode }),
    });
    const payload = await response.json();
    setMessage(response.ok ? payload.message : payload.error);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        Please check these fields carefully. Your profile step is marked complete only when your email, address, city, and pincode are all available.
      </div>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        City
        <input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)] md:col-span-2">
        Address line 1
        <input value={address1} onChange={(e) => setAddress1(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)] md:col-span-2">
        Address line 2
        <input value={address2} onChange={(e) => setAddress2(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)] md:col-span-2">
        Address line 3
        <input value={address3} onChange={(e) => setAddress3(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Pincode
        <input value={pincode} onChange={(e) => setPincode(e.target.value)} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
      </label>
      <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
        <p className="text-sm text-[var(--muted)]">{message ?? "Save once all details are correct."}</p>
        <button className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">Save profile changes</button>
      </div>
    </form>
  );
}
