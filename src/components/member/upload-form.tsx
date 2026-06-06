"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

type DocumentKind = "aadhar" | "passport";
type SlotKey = "selfie" | "aadharFront" | "aadharBack" | "passportFirstPage" | "passportLastPage";

interface ExistingUploadItem {
  id: string;
  documentGroup: string;
  documentPart: string;
  fileName: string;
  previewUrl: string | null;
}

export function UploadForm({ items }: { items: ExistingUploadItem[] }) {
  const router = useRouter();
  const [documentKind, setDocumentKind] = useState<DocumentKind>("aadhar");
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<SlotKey | null>(null);
  const [selectedNames, setSelectedNames] = useState<Record<SlotKey, string>>({
    selfie: "",
    aadharFront: "",
    aadharBack: "",
    passportFirstPage: "",
    passportLastPage: "",
  });
  const [localPreview, setLocalPreview] = useState<Record<SlotKey, string | null>>({
    selfie: null,
    aadharFront: null,
    aadharBack: null,
    passportFirstPage: null,
    passportLastPage: null,
  });

  const selfieRef = useRef<HTMLInputElement>(null);
  const aadharFrontRef = useRef<HTMLInputElement>(null);
  const aadharBackRef = useRef<HTMLInputElement>(null);
  const passportFirstPageRef = useRef<HTMLInputElement>(null);
  const passportLastPageRef = useRef<HTMLInputElement>(null);

  const refs: Record<SlotKey, React.RefObject<HTMLInputElement | null>> = {
    selfie: selfieRef,
    aadharFront: aadharFrontRef,
    aadharBack: aadharBackRef,
    passportFirstPage: passportFirstPageRef,
    passportLastPage: passportLastPageRef,
  };

  const existingMap: Partial<Record<SlotKey, ExistingUploadItem>> = {
    selfie: items.find((item) => item.documentGroup === "selfie"),
    aadharFront: items.find((item) => item.documentGroup === "aadhar" && item.documentPart === "front"),
    aadharBack: items.find((item) => item.documentGroup === "aadhar" && item.documentPart === "back"),
    passportFirstPage: items.find((item) => item.documentGroup === "passport" && item.documentPart === "first_page"),
    passportLastPage: items.find((item) => item.documentGroup === "passport" && item.documentPart === "last_page"),
  };

  function getLabel(key: SlotKey) {
    switch (key) {
      case "selfie":
        return "Selfie photo";
      case "aadharFront":
        return "Front Side Of Aadhar";
      case "aadharBack":
        return "Back Side Of Aadhar";
      case "passportFirstPage":
        return "First Page Of Passport";
      case "passportLastPage":
        return "Last Page Of Passport";
    }
  }

  function getAspectClass(key: SlotKey) {
    return key === "selfie" ? "max-h-[300px]" : "max-h-[220px]";
  }

  function getPreviewUrl(key: SlotKey) {
    return localPreview[key] || existingMap[key]?.previewUrl || null;
  }

  function getFileName(key: SlotKey) {
    if (localPreview[key]) return selectedNames[key] || "Selected file";
    return existingMap[key]?.fileName ?? "No file uploaded yet";
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
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
      if (!blob) throw new Error("Unable to compress the selected image.");
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function uploadSlot(key: SlotKey, rawFile: File) {
    setUploadingSlot(key);
    setMessage(null);

    try {
      const file = await compressImage(rawFile);
      if (file.size > MAX_UPLOAD_BYTES) {
        setMessage("Selected file is too large. Please use a smaller image or lighter PDF document.");
        return;
      }

      const formData = new FormData();
      if (key === "selfie") {
        formData.append("selfie", file);
      } else {
        formData.append("documentKind", key.startsWith("aadhar") ? "aadhar" : "passport");
        formData.append(key, file);
      }

      const response = await fetch("/api/member/uploads", { method: "POST", body: formData });
      const raw = await response.text();
      let payload: { message?: string; error?: string } = {};
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { error: response.status === 413 ? "Selected file is too large for upload. Please choose a smaller file and try again." : "Upload failed. Please try again." };
      }

      if (!response.ok) {
        setMessage(payload.error ?? "Upload failed.");
        return;
      }

      setMessage(payload.message ?? "File uploaded successfully.");
      if (localPreview[key]) {
        URL.revokeObjectURL(localPreview[key]!);
      }
      setLocalPreview((current) => ({ ...current, [key]: null }));
      setSelectedNames((current) => ({ ...current, [key]: "" }));
      if (refs[key].current) refs[key].current.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function renderSlot(key: SlotKey) {
    const preview = getPreviewUrl(key);
    const hasExisting = Boolean(existingMap[key]);
    const isUploading = uploadingSlot === key;
    const triggerClassName = "inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60";

    return (
      <div className="flex flex-col gap-3 text-sm text-[var(--muted)]">
        <span>{getLabel(key)}</span>
        {preview ? (
          <button
            type="button"
            onClick={() => refs[key].current?.click()}
            disabled={isUploading}
            className={`relative flex max-w-[260px] ${getAspectClass(key)} items-center justify-center overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb] text-left ${isUploading ? "pointer-events-none" : "cursor-pointer"}`}
          >
            <Image
              src={preview}
              alt={`${key} preview`}
              width={800}
              height={800}
              unoptimized
              className="h-auto max-h-full w-full rounded-[22px] object-cover"
            />
          </button>
        ) : null}
        <input type="text" value={getFileName(key)} readOnly className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        <input
          id={key}
          type="file"
          ref={refs[key]}
          accept={key === "selfie" ? "image/*" : "image/*,.pdf"}
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setSelectedNames((current) => ({ ...current, [key]: file.name }));
            if (localPreview[key]) URL.revokeObjectURL(localPreview[key]!);
            if (file.type.startsWith("image/")) {
              setLocalPreview((current) => ({ ...current, [key]: URL.createObjectURL(file) }));
            } else {
              setLocalPreview((current) => ({ ...current, [key]: null }));
            }
            await uploadSlot(key, file);
          }}
        />
        <button
          type="button"
          onClick={() => refs[key].current?.click()}
          disabled={isUploading}
          className={triggerClassName}
        >
          {isUploading ? "Uploading..." : hasExisting ? "Replace file" : key === "selfie" ? "Upload selfie" : "Choose file"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-[22px] border border-[#c8d3ea] bg-[#eef2fb] px-4 py-4 text-sm font-medium leading-6 text-[#24345f] shadow-sm">
        Each file uploads immediately after you choose it. You can replace uploaded files at any time.
      </div>

      {renderSlot("selfie")}

      <div className="grid gap-4 self-start">
        <label className="grid gap-3 text-sm text-[var(--muted)]">
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

        <div className="grid gap-5">
          {documentKind === "aadhar" ? (
            <>
              {renderSlot("aadharFront")}
              {renderSlot("aadharBack")}
            </>
          ) : (
            <>
              {renderSlot("passportFirstPage")}
              {renderSlot("passportLastPage")}
            </>
          )}
        </div>
      </div>

      {message ? (
        <p className={`text-sm md:col-span-2 ${!message.toLowerCase().includes("success") && !message.toLowerCase().includes("uploaded") ? "font-semibold text-red-600" : "text-[var(--muted)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
