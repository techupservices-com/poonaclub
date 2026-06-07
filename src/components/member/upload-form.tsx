"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

interface SelfieItem {
  id: string;
  fileName: string;
  previewUrl: string | null;
}

export function UploadForm({ selfie }: { selfie?: SelfieItem | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  async function uploadSelfie(rawFile: File) {
    setIsUploading(true);
    setMessage(null);

    try {
      if (!rawFile.type.startsWith("image/")) {
        setMessage("Please choose an image file for the selfie upload.");
        return;
      }

      const file = await compressImage(rawFile);
      if (file.size > MAX_UPLOAD_BYTES) {
        setMessage("Selected file is too large. Please use a smaller image.");
        return;
      }

      const formData = new FormData();
      formData.append("selfie", file);
      const response = await fetch("/api/member/uploads", { method: "POST", body: formData });
      const raw = await response.text();
      let payload: { message?: string; error?: string } = {};
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { error: response.status === 413 ? "Selected file is too large for upload. Please choose a smaller image and try again." : "Upload failed. Please try again." };
      }

      if (!response.ok) {
        setMessage(payload.error ?? "Upload failed.");
        return;
      }

      setMessage(payload.message ?? "Selfie uploaded successfully.");
      setSelectedName("");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  const currentPreview = previewUrl || selfie?.previewUrl || null;
  const currentName = previewUrl ? selectedName || "Selected file" : selfie?.fileName ?? "No selfie uploaded yet";

  return (
    <div className="grid gap-4">
      <div className="rounded-[22px] border border-[#c8d3ea] bg-[#eef2fb] px-4 py-4 text-sm font-medium leading-6 text-[#24345f] shadow-sm">
        Choose a clear selfie photograph. The file uploads immediately after you select it, and you can replace it at any time.
      </div>

      <div className="flex flex-col gap-3 text-sm text-[var(--muted)]">
        <span>Selfie photo</span>
        {currentPreview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="relative flex aspect-[4/5] w-[180px] items-center justify-center overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb] text-left disabled:opacity-60 sm:w-[210px] md:w-[220px]"
          >
            <Image
              src={currentPreview}
              alt="Selfie preview"
              fill
              unoptimized
              className="rounded-[22px] object-cover"
            />
          </button>
        ) : null}
        <input type="text" value={currentName} readOnly className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]" />
        <input
          id="selfie"
          type="file"
          ref={inputRef}
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setSelectedName(file.name);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));
            await uploadSelfie(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex w-fit rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e] disabled:opacity-60"
        >
          {isUploading ? "Uploading..." : selfie?.previewUrl ? "Replace file" : "Upload selfie"}
        </button>
      </div>

      {message ? (
        <p className={`text-sm ${!message.toLowerCase().includes("success") && !message.toLowerCase().includes("uploaded") ? "font-semibold text-red-600" : "text-[var(--muted)]"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
