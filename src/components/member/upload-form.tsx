"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const UPLOAD_SCROLL_FLAG = "pc-scroll-existing-uploads";

type DocumentKind = "aadhar" | "passport";
type SlotKey = "selfie" | "aadharFront" | "aadharBack" | "passportFirstPage" | "passportLastPage";

export function UploadForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentKind, setDocumentKind] = useState<DocumentKind>("aadhar");
  const [fileNames, setFileNames] = useState<Record<SlotKey, string>>({
    selfie: "No file chosen",
    aadharFront: "No file chosen",
    aadharBack: "No file chosen",
    passportFirstPage: "No file chosen",
    passportLastPage: "No file chosen",
  });
  const [previews, setPreviews] = useState<Record<SlotKey, string | null>>({
    selfie: null,
    aadharFront: null,
    aadharBack: null,
    passportFirstPage: null,
    passportLastPage: null,
  });

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const aadharFrontRef = useRef<HTMLInputElement>(null);
  const aadharBackRef = useRef<HTMLInputElement>(null);
  const passportFirstPageRef = useRef<HTMLInputElement>(null);
  const passportLastPageRef = useRef<HTMLInputElement>(null);

  const inputMap = {
    selfie: selfieInputRef,
    aadharFront: aadharFrontRef,
    aadharBack: aadharBackRef,
    passportFirstPage: passportFirstPageRef,
    passportLastPage: passportLastPageRef,
  } as const;

  function getInputForKey(key: SlotKey) {
    switch (key) {
      case "selfie":
        return selfieInputRef.current;
      case "aadharFront":
        return aadharFrontRef.current;
      case "aadharBack":
        return aadharBackRef.current;
      case "passportFirstPage":
        return passportFirstPageRef.current;
      case "passportLastPage":
        return passportLastPageRef.current;
    }
  }

  function setFileState(key: SlotKey, file: File | null) {
    setFileNames((current) => ({
      ...current,
      [key]: file?.name ?? "No file chosen",
    }));

    setPreviews((current) => {
      if (current[key]) URL.revokeObjectURL(current[key]!);
      return {
        ...current,
        [key]: file ? URL.createObjectURL(file) : null,
      };
    });
  }

  function clearSlot(key: SlotKey) {
    const input = getInputForKey(key);
    if (input) input.value = "";
    setFileState(key, null);
  }

  async function compressImage(file: File) {
    if (!file.type.startsWith("image/")) return file;
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to process the selected image."));
        img.src = imageUrl;
      });

      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Unable to prepare image upload.");
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
      });

      if (!blob) throw new Error("Unable to compress the selected image.");

      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function getPreparedFile(key: SlotKey) {
    const file = inputMap[key].current?.files?.[0] ?? null;
    if (!file) return null;
    return compressImage(file);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUploading(true);
    setMessage("Uploading...");

    try {
      const selfie = await getPreparedFile("selfie");
      const aadharFront = await getPreparedFile("aadharFront");
      const aadharBack = await getPreparedFile("aadharBack");
      const passportFirstPage = await getPreparedFile("passportFirstPage");
      const passportLastPage = await getPreparedFile("passportLastPage");

      const files = [selfie, aadharFront, aadharBack, passportFirstPage, passportLastPage].filter(Boolean) as File[];

      if (!files.length) {
        setMessage("Please choose at least one file to upload.");
        return;
      }

      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > MAX_UPLOAD_BYTES) {
        setMessage("Selected files are too large. Please use smaller images or a lighter PDF document.");
        return;
      }

      const formData = new FormData();
      formData.append("documentKind", documentKind);
      if (selfie) formData.append("selfie", selfie);
      if (aadharFront) formData.append("aadharFront", aadharFront);
      if (aadharBack) formData.append("aadharBack", aadharBack);
      if (passportFirstPage) formData.append("passportFirstPage", passportFirstPage);
      if (passportLastPage) formData.append("passportLastPage", passportLastPage);

      const response = await fetch("/api/member/uploads", { method: "POST", body: formData });
      const raw = await response.text();
      let payload: { message?: string; error?: string } = {};

      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { error: response.status === 413 ? "Selected files are too large for upload. Please choose smaller files and try again." : "Upload failed. Please try again." };
      }

      setMessage(response.ok ? payload.message ?? "Files uploaded successfully." : payload.error ?? "Upload failed.");
      if (response.ok) {
        window.sessionStorage.setItem(UPLOAD_SCROLL_FLAG, "1");
        (Object.keys(inputMap) as SlotKey[]).forEach(clearSlot);
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function renderPreview(key: SlotKey) {
    const preview = previews[key];
    if (!preview) return null;

    return (
      <div className="mt-2 flex max-w-[220px] flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb] sm:aspect-[4/5]">
          <Image src={preview} alt={`${key} preview`} fill unoptimized className="object-cover" />
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={key} className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
            Replace file
          </label>
          <button
            type="button"
            onClick={() => clearSlot(key)}
            className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
          >
            Remove file
          </button>
        </div>
      </div>
    );
  }

  function uploadInput(key: SlotKey, label: string, accept = "image/*,.pdf") {
    return (
      <label className="flex flex-col gap-2 text-sm text-[var(--muted)]">
        {label}
        <input type="text" value={fileNames[key]} readOnly className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        <input
          id={key}
          type="file"
          ref={inputMap[key]}
          accept={accept}
          className="hidden"
          onChange={(event) => setFileState(key, event.target.files?.[0] ?? null)}
        />
        <label htmlFor={key} className="inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">
          Choose file
        </label>
        {renderPreview(key)}
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
        Upload one clear selfie and a supported identity document set. Existing legacy document uploads will not count until re-uploaded in the new format.
      </div>

      <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
        <span>Selfie photo</span>
        <div
          role="button"
          tabIndex={0}
          onClick={() => selfieInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selfieInputRef.current?.click();
            }
          }}
          className="relative flex aspect-square max-w-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb] sm:aspect-[4/5]"
        >
          {previews.selfie ? (
            <Image src={previews.selfie} alt="Selected selfie preview" fill unoptimized className="object-cover" />
          ) : (
            <span className="px-4 text-center text-sm font-semibold text-[#3c589e]">Tap to choose your selfie</span>
          )}
        </div>
        <input type="text" value={fileNames.selfie} readOnly className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        <input
          id="selfie"
          type="file"
          ref={selfieInputRef}
          accept="image/*"
          className="hidden"
          onChange={(event) => setFileState("selfie", event.target.files?.[0] ?? null)}
        />
        <label htmlFor="selfie" className="inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]">
          Upload selfie
        </label>
        {previews.selfie ? (
          <div className="flex flex-wrap gap-2">
            <label htmlFor="selfie" className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
              Replace
            </label>
            <button type="button" onClick={() => clearSlot("selfie")} className="inline-flex w-fit rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm text-[var(--muted)]">
          Supporting document type
          <select
            value={documentKind}
            onChange={(event) => setDocumentKind(event.target.value as DocumentKind)}
            className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
          >
            <option value="aadhar">Aadhar Card</option>
            <option value="passport">Passport</option>
          </select>
        </label>

        {documentKind === "aadhar" ? (
          <div className="grid gap-4">
            {uploadInput("aadharFront", "Front Side Of Aadhar")}
            {uploadInput("aadharBack", "Back Side Of Aadhar")}
          </div>
        ) : (
          <div className="grid gap-4">
            {uploadInput("passportFirstPage", "First Page Of Passport")}
            {uploadInput("passportLastPage", "Last Page Of Passport")}
          </div>
        )}
      </div>

      <div className="md:col-span-2 flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
        <button disabled={isUploading} className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:cursor-not-allowed disabled:opacity-60">
          {isUploading ? "Uploading..." : "Upload files"}
        </button>
        <p className={`text-sm md:text-right ${message && !message.toLowerCase().includes("upload") ? "font-semibold text-red-600" : "text-[var(--muted)]"}`}>
          {message ?? "Accepted formats: images for selfie and document pages, or PDF where applicable. You can upload only the missing pages if needed."}
        </p>
      </div>
    </form>
  );
}
