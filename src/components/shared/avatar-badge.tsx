import { getInitials } from "@/lib/utils";

export function AvatarBadge({ name }: { name: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d7e0f4] via-[#eef2fb] to-white text-lg font-semibold text-[#24345f] shadow-sm">
      {getInitials(name)}
    </div>
  );
}
