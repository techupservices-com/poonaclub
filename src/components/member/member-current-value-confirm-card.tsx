"use client";

export function MemberCurrentValueConfirmCard({
  label,
  value,
  instruction,
  showConfirm,
  isConfirming = false,
  onConfirm,
  onEdit,
}: {
  label: string;
  value: string;
  instruction: string;
  showConfirm: boolean;
  isConfirming?: boolean;
  onConfirm?: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="soft-card rounded-[24px] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Current record</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Our current records show your registered {label} to be :</p>
      <div className="mt-4 rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-base font-semibold text-[var(--foreground)]">
        {value}
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{instruction}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {showConfirm ? (
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isConfirming ? "Confirming..." : "Confirm"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-2xl bg-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-300"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
