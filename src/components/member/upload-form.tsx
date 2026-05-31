"use client";

import Image from "next/image";
import { useState } from "react";

export function UploadForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [selfieFileName, setSelfieFileName] = useState("No file chosen");
  const [documentFileName, setDocumentFileName] = useState("No file chosen");
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [documentIsImage, setDocumentIsImage] = useState(false);

  function clearSelfie(input: HTMLInputElement | null) {
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
    if (input) input.value = "";
    setSelfiePreviewUrl(null);
    setSelfieFileName("No file chosen");
  }

  function clearDocument(input: HTMLInputElement | null) {
    if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
    if (input) input.value = "";
    setDocumentPreviewUrl(null);
    setDocumentFileName("No file chosen");
    setDocumentIsImage(false);
  }

  function resetPreviews() {
    clearSelfie(document.getElementById("selfie") as HTMLInputElement | null);
    clearDocument(document.getElementById("document") as HTMLInputElement | null);
  }

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
    if (response.ok) {
      form.reset();
      setSelfieFileName("No file chosen");
      setDocumentFileName("No file chosen");
      resetPreviews();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        Upload one clear selfie and one supporting document. Both are required before your membership can be marked verified.
      </div>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Selfie photo
        <input
          type="text"
          value={selfieFileName}
          readOnly
          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
        />
        <input
          id="selfie"
          type="file"
          name="selfie"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setSelfieFileName(file?.name ?? "No file chosen");
            if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
            setSelfiePreviewUrl(file ? URL.createObjectURL(file) : null);
          }}
          required
        />
        <label htmlFor="selfie" className="inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">
          Choose file
        </label>
        {selfiePreviewUrl ? (
          <div className="mt-2 grid gap-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb]">
              <Image src={selfiePreviewUrl} alt="Selected selfie preview" fill unoptimized className="object-cover" />
            </div>
            <div className="flex gap-2">
              <label htmlFor="selfie" className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                Replace file
              </label>
              <button
                type="button"
                onClick={() => clearSelfie(document.getElementById("selfie") as HTMLInputElement | null)}
                className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
              >
                Remove file
              </button>
            </div>
          </div>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm text-[var(--muted)]">
        Supporting document
        <input
          type="text"
          value={documentFileName}
          readOnly
          className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
        />
        <input
          id="document"
          type="file"
          name="document"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setDocumentFileName(file?.name ?? "No file chosen");
            if (documentPreviewUrl) URL.revokeObjectURL(documentPreviewUrl);
            if (file) {
              const isImage = file.type.startsWith("image/");
              setDocumentIsImage(isImage);
              setDocumentPreviewUrl(URL.createObjectURL(file));
            } else {
              setDocumentIsImage(false);
              setDocumentPreviewUrl(null);
            }
          }}
          required
        />
        <label htmlFor="document" className="inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">
          Choose file
        </label>
        {documentPreviewUrl ? (
          documentIsImage ? (
            <div className="mt-2 grid gap-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb]">
                <Image src={documentPreviewUrl} alt="Selected supporting document preview" fill unoptimized className="object-cover" />
              </div>
              <div className="flex gap-2">
                <label htmlFor="document" className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                  Replace file
                </label>
                <button
                  type="button"
                  onClick={() => clearDocument(document.getElementById("document") as HTMLInputElement | null)}
                  className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
                >
                  Remove file
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid gap-3">
              <div className="rounded-[22px] border border-[var(--border)] bg-[#eef2fb] px-4 py-5 text-sm text-[#24345f]">
                <p className="font-semibold">Document selected</p>
                <p className="mt-1 break-all text-[var(--muted)]">{documentFileName}</p>
              </div>
              <div className="flex gap-2">
                <label htmlFor="document" className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
                  Replace file
                </label>
                <button
                  type="button"
                  onClick={() => clearDocument(document.getElementById("document") as HTMLInputElement | null)}
                  className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
                >
                  Remove file
                </button>
              </div>
            </div>
          )
        ) : null}
      </label>
      <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
        <p className="text-sm text-[var(--muted)]">{message ?? "Accepted formats: images for selfie, images or PDF for supporting document."}</p>
        <button className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">Upload files</button>
      </div>
    </form>
  );
}
