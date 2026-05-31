import { cn } from "@/lib/utils";

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "danger" && "border-[#b9c8ea] bg-[#eef2fb] text-[#3c589e]",
        tone === "neutral" && "border-stone-200 bg-stone-100 text-stone-700",
      )}
    >
      {label}
    </span>
  );
}
