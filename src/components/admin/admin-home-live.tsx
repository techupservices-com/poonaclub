"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import { formatMobile } from "@/lib/utils";

interface PreviewMember {
  id: string;
  fullName: string;
  membershipId: string;
  currentMobile: string;
  photoUrl?: string;
}

interface RecentAuditItem {
  id: string;
  action: string;
  actorType: string;
  createdAt: string;
  formattedCreatedAt: string;
  memberName: string;
  membershipId: string;
  mobile: string;
}

interface AdminHomepageData {
  counts: {
    totalMembers: number;
    inprogress: number;
    verified: number;
    notstarted: number;
  };
  members: PreviewMember[];
  recentAuditItems: RecentAuditItem[];
}

export function AdminHomeLive({ initialData }: { initialData: AdminHomepageData }) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh dashboard right now. Please try again.");
        return;
      }
      setData(payload);
    } catch {
      setError("Unable to refresh dashboard right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  useVisiblePolling(60000, refresh);

  const summaryCards = [
    { label: "Total Members", value: data.counts.totalMembers, href: "/admin/members" },
    { label: "In Progress", value: data.counts.inprogress, href: "/admin/members?filters=inprogress" },
    { label: "Verified", value: data.counts.verified, href: "/admin/members?filters=verified" },
    { label: "Not Started", value: data.counts.notstarted, href: "/admin/members?filters=notstarted" },
  ];

  return (
    <>
      <div className="flex justify-end">
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

      <section className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <Link key={card.label} href={card.href} className="soft-card rounded-[26px] p-5 transition hover:border-[#6f84ba] hover:bg-[#eef2fb]">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">{card.label}</p>
            <p className="mt-3 text-4xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="soft-card rounded-[28px] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Main admin action</p>
              <h2 className="text-2xl font-semibold">Member directory</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the directory to search members, review verification progress, open full details, or correct profile information.</p>
            </div>
            <Link href="/admin/members" className="whitespace-nowrap rounded-full bg-[#3c589e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f467e]">View all</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.members.map((member) => (
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
        </div>

        <div className="soft-card rounded-[28px] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Recent activity</p>
              <h2 className="mt-2 text-2xl font-semibold">Recent audit events</h2>
            </div>
            <Link href="/admin/audit" className="whitespace-nowrap rounded-full bg-[#3c589e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f467e]">View all</Link>
          </div>
          <div className="mt-6 space-y-3">
            {data.recentAuditItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No admin changes recorded yet.</p>
            ) : (
              data.recentAuditItems.map((entry) => (
                <div key={entry.id} className="rounded-[24px] border border-[var(--border)] bg-white px-4 py-4">
                  <p className="font-medium">{entry.action}</p>
                  <p className="mt-1 text-sm text-[var(--foreground)]">
                    {entry.memberName} · {entry.membershipId} · {formatMobile(entry.mobile)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {entry.actorType} · {entry.formattedCreatedAt}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
    </>
  );
}
