"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import type { MemberWithVerification } from "@/lib/types";

export function AdminMemberForm({ member }: { member: MemberWithVerification }) {
  const [form, setForm] = useState({
    email: member.email,
    currentMobile: member.currentMobile,
    address1: member.address1,
    address2: member.address2,
    address3: member.address3,
    city: member.city,
    pincode: member.pincode,
    status: member.status,
  });
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving...");
    const response = await fetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setMessage(response.ok ? payload.message : payload.error);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        Admin can correct member data here, but verification status remains system-driven. Update the fields carefully and save once the record is accurate.
      </div>
      {Object.entries(form).map(([key, value]) => (
        <label
          key={key}
          className={cn(
            "grid gap-2 text-sm text-[var(--muted)]",
            key.startsWith("address") ? "md:col-span-2" : "md:col-span-1",
          )}
        >
          {key}
          <input
            value={value}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
          />
        </label>
      ))}
      <div className="md:col-span-2 flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--muted)]">{message ?? "Review member details, then save your corrections."}</p>
        <button className="rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-strong)]">Save member details</button>
      </div>
    </form>
  );
}
