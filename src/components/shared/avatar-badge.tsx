"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AvatarBadge({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string;
  className?: string;
}) {
  const [imageBroken, setImageBroken] = useState(false);
  const showPhoto = Boolean(photoUrl && !imageBroken);

  return (
    <div
      className={cn(
        "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#d7e0f4] via-[#eef2fb] to-white text-lg font-semibold text-[#24345f] shadow-sm ring-1 ring-[#c8d3ea]",
        className,
      )}
    >
      {showPhoto ? (
        <Image
          src={photoUrl!}
          alt={`${name} profile`}
          fill
          sizes="(max-width: 768px) 64px, 224px"
          className="object-contain"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-[#3c589e] shadow-sm">
          <User className="h-5 w-5" />
        </span>
      )}
    </div>
  );
}
