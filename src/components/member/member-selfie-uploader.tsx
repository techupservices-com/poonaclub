"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export function MemberSelfieUploader({
  photoUrl,
  hasSelfie,
  variant = "record",
}: {
  photoUrl: string | null;
  hasSelfie: boolean;
  variant?: "record" | "panel";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const previousPhotoUrl = useRef<string | null>(photoUrl);

  useEffect(() => {
    if (uploadState === "uploading" && photoUrl && photoUrl !== previousPhotoUrl.current) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setUploadState("idle");
      setMessage(null);
      previousPhotoUrl.current = photoUrl;
    }

    previousPhotoUrl.current = photoUrl;
  }, [photoUrl, uploadState]);

  async function compressImage(file: File) {
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
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg", lastModified: Date.now() });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function uploadSelfie(file: File) {
    setUploadState("uploading");
    setMessage(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file for the selfie upload.");
      }
      const prepared = await compressImage(file);
      const formData = new FormData();
      formData.append("selfie", prepared);
      const response = await fetch("/api/member/uploads", { method: "POST", body: formData });
      if (response.ok) {
        router.refresh();
      } else {
        setUploadState("idle");
        setMessage("Selfie upload failed. Please try again.");
      }
    } catch (error) {
      setUploadState("idle");
      setMessage(error instanceof Error ? error.message : "Selfie upload failed. Please try again.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const imageSizes =
    variant === "panel"
      ? "(max-width: 640px) 180px, (max-width: 1024px) 210px, 220px"
      : "(max-width: 640px) 260px, (max-width: 1024px) 236px, 236px";

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (uploadState !== "uploading") inputRef.current?.click();
          }
        }}
        className={`group relative flex items-center justify-center overflow-hidden rounded-[28px] border border-[var(--border)] bg-[#eef2fb] shadow-sm ${variant === "panel" ? "aspect-[4/5] w-[180px] sm:w-[210px] md:w-[220px]" : "aspect-square w-full sm:aspect-[4/5] lg:max-h-[236px]"} ${uploadState === "uploading" ? "pointer-events-none opacity-90" : ""}`}
      >
        {previewUrl || photoUrl ? (
          <Image src={previewUrl || photoUrl!} alt="Member selfie" fill sizes={imageSizes} className="object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-[#3c589e]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm sm:h-16 sm:w-16">
              <Camera className="h-8 w-8" />
            </span>
            <span className="text-sm font-semibold tracking-[0.01em]">Set profile photo</span>
          </div>
        )}
        <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/92 px-3 py-2 text-center text-[11px] font-semibold text-[#24345f] shadow-sm transition group-hover:bg-white sm:inset-x-3 sm:bottom-3 sm:text-xs">
          {uploadState === "uploading"
            ? "Uploading..."
            : hasSelfie || photoUrl
                ? "Replace photo"
                : "Upload selfie"}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(URL.createObjectURL(file));
          void uploadSelfie(file);
        }}
      />
      {uploadState === "uploading" ? <p className="text-sm font-semibold text-[var(--muted)]">Uploading...</p> : null}
      {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
