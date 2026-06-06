"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const UPLOAD_SCROLL_FLAG = "pc-scroll-existing-uploads";

interface UploadedFileItem {
  id: string;
  documentType: "selfie" | "document";
  documentGroup: string;
  documentPart: string;
  fileName: string;
  uploadedAt: string;
  previewUrl: string | null;
  mimeType: string;
}

export function ExistingUploadedFiles({ items }: { items: UploadedFileItem[] }) {
  const router = useRouter();
  const [busyType, setBusyType] = useState<"selfie" | "document" | null>(null);
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, boolean>>({});
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(UPLOAD_SCROLL_FLAG) !== "1") return;

    window.sessionStorage.removeItem(UPLOAD_SCROLL_FLAG);
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  async function removeFile(item: UploadedFileItem) {
    setBusyType(item.documentType);
    const response = await fetch(`/api/member/uploads/${item.documentType}?documentId=${item.id}`, { method: "DELETE" });
    setBusyType(null);
    if (response.ok) router.refresh();
  }

  function replaceFile(item: UploadedFileItem) {
    const key =
      item.documentGroup === "selfie"
        ? "selfie"
        : item.documentGroup === "aadhar"
          ? item.documentPart === "front"
            ? "aadharFront"
            : "aadharBack"
          : item.documentGroup === "passport"
            ? item.documentPart === "first_page"
              ? "passportFirstPage"
              : "passportLastPage"
            : "document";
    document.getElementById(key)?.click();
  }

  function getLabel(item: UploadedFileItem) {
    if (item.documentGroup === "selfie") return "Selfie";
    if (item.documentGroup === "aadhar" && item.documentPart === "front") return "Aadhar Front";
    if (item.documentGroup === "aadhar" && item.documentPart === "back") return "Aadhar Back";
    if (item.documentGroup === "passport" && item.documentPart === "first_page") return "Passport First Page";
    if (item.documentGroup === "passport" && item.documentPart === "last_page") return "Passport Last Page";
    return "Legacy document";
  }

  return (
    <div ref={sectionRef} className="mt-5 grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-[22px] border border-[var(--border)] bg-white p-4">
          {item.previewUrl && !brokenPreviews[item.id] ? (
            <div className="relative mb-4 aspect-square max-w-[220px] overflow-hidden rounded-[18px] bg-[#eef2fb] sm:aspect-[4/5]">
              <Image
                src={item.previewUrl}
                alt={`${item.documentType} preview`}
                fill
                unoptimized
                className="object-cover"
                onError={() =>
                  setBrokenPreviews((current) => ({
                    ...current,
                    [item.id]: true,
                  }))
                }
              />
            </div>
          ) : (
            <div className="mb-4 max-w-[220px] rounded-[18px] border border-[var(--border)] bg-[#eef2fb] px-4 py-5 text-sm text-[#24345f]">
              <p className="font-semibold">Preview unavailable</p>
              <p className="mt-1 break-all text-[var(--muted)]">{item.fileName}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{getLabel(item)}</p>
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]">{item.fileName}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Uploaded {item.uploadedAt}</p>
          {item.documentGroup === "legacy" ? (
            <p className="mt-2 text-xs font-semibold text-red-600">Legacy upload on record. Please upload the document again in the new Aadhar or Passport format.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => replaceFile(item)}
              className="inline-flex rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
            >
              Replace file
            </button>
            <button
              type="button"
              disabled={busyType === item.documentType}
              onClick={() => removeFile(item)}
              className="inline-flex rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:opacity-60"
            >
              {busyType === item.documentType ? "Removing..." : "Remove file"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
