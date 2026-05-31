"use client";

import { useState } from "react";

export function UploadForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage("Uploading...");
    const response = await fetch("/api/member/uploads", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setMessage(response.ok ? payload.message : payload.error);
    if (response.ok) form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        Upload one clear selfie and one supporting document. Both are required before your membership can be marked verified.
      </div>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Selfie photo
        <input type="file" name="selfie" accept="image/*" className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" required />
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Supporting document
        <input type="file" name="document" accept="image/*,.pdf" className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" required />
      </label>
      <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
        <p className="text-sm text-[var(--muted)]">{message ?? "Accepted formats: images for selfie, images or PDF for supporting document."}</p>
        <button className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">Upload files</button>
      </div>
    </form>
  );
}
