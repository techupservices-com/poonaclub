"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

interface PreviewMember {
  id: string;
  fullName: string;
  membershipId: string;
  currentMobile: string;
  photoUrl?: string;
}

export function AdminMemberPreview({ initialMembers }: { initialMembers: PreviewMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/members/preview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh members right now. Please try again.");
        return;
      }
      setMembers(payload.members ?? []);
    } catch {
      setError("Unable to refresh members right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useVisiblePolling(30000, refresh);

  return (
    <div className="soft-card rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Main admin action</p>
          <h2 className="text-2xl font-semibold">Member directory</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the directory to search members, review verification progress, open full details, or correct profile information.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {members.map((member) => (
          <div key={member.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
            <div className="flex items-center gap-3">
              <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} />
              <div>
                <p className="font-semibold">{member.fullName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · {member.currentMobile}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
