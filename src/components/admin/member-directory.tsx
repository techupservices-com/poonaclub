"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { useVisiblePolling } from "@/hooks/use-visible-polling";
import type { MemberWithVerification } from "@/lib/types";
import { cn, formatMobile } from "@/lib/utils";

type FilterKey = "verified" | "shared" | "inprogress" | "notstarted";

export function MemberDirectory({
  members,
  counts,
  total,
  currentPage,
  pageSize,
  query,
  filters,
  view,
  sort,
}: {
  members: MemberWithVerification[];
  counts: { all: number; verified: number; inprogress: number; notstarted: number; shared: number };
  total: number;
  currentPage: number;
  pageSize: number;
  query: string;
  filters: FilterKey[];
  view: "grid" | "list";
  sort: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [currentMembers, setCurrentMembers] = useState(members);
  const [currentCounts, setCurrentCounts] = useState(counts);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(currentTotal / pageSize));

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentPage > 1) params.set("page", String(currentPage));
      if (query) params.set("q", query);
      if (filters.length) params.set("filters", filters.join(","));
      if (view !== "grid") params.set("view", view);
      if (sort !== "name_asc") params.set("sort", sort);
      const response = await fetch(`/api/admin/members${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to refresh members right now. Please try again.");
        return;
      }
      setCurrentMembers(payload.members ?? []);
      setCurrentCounts(payload.counts ?? currentCounts);
      setCurrentTotal(payload.total ?? currentTotal);
    } catch {
      setError("Unable to refresh members right now. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPage, currentCounts, currentTotal, filters, isRefreshing, query, sort, view]);

  useVisiblePolling(60000, refresh);

  function updateParams(next: {
    page?: number;
    q?: string;
    filters?: FilterKey[];
    view?: "grid" | "list";
    sort?: string;
  }) {
    const params = new URLSearchParams();
    const nextPage = next.page ?? currentPage;
    const nextQuery = next.q ?? query;
    const nextFilters = next.filters ?? filters;
    const nextView = next.view ?? view;
    const nextSort = next.sort ?? sort;

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextQuery) params.set("q", nextQuery);
    if (nextFilters.length) params.set("filters", nextFilters.join(","));
    if (nextView !== "grid") params.set("view", nextView);
    if (nextSort !== "name_asc") params.set("sort", nextSort);

    router.push(`/admin/members${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const filterOptions = [
    { value: "inprogress" as const, label: "In Progress", count: currentCounts.inprogress },
    { value: "verified" as const, label: "Verified", count: currentCounts.verified },
    { value: "notstarted" as const, label: "Not Started", count: currentCounts.notstarted },
    { value: "shared" as const, label: "Shared mobile", count: currentCounts.shared },
  ];

  return (
    <div className="grid gap-5">
      <div className="shell-panel rounded-[24px] p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateParams({ filters: [], page: 1 })}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                filters.length === 0
                  ? "border-[#6f84ba] bg-[#3c589e] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
              )}
            >
              <span>All members</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", filters.length === 0 ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{currentCounts.all}</span>
            </button>

            {filterOptions.map((option) => {
              const isActive = filters.length === 1 && filters[0] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => updateParams({ filters: isActive ? [] : [option.value], page: 1 })}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                    isActive
                      ? "border-[#6f84ba] bg-[#3c589e] text-white"
                      : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
                  )}
                >
                  <span>{option.label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isActive ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{option.count}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb] disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member directory</p>
          <label htmlFor="member-search" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
            Search by member name, membership ID, mobile number or email address
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
              <input
                id="member-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") updateParams({ q: search.trim(), page: 1 });
                }}
                placeholder="Search members"
                className="w-full flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
              />
              <button
                onClick={() => updateParams({ q: search.trim(), page: 1 })}
                className="h-12 rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setSearch("");
                  updateParams({ q: "", page: 1, filters: filters.length ? filters : [] });
                }}
                className="h-12 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]"
              >
                Clear
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Combine filters to narrow the list, such as pending members with shared mobile numbers.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="grid grid-cols-2 gap-3 w-full md:w-[260px]">
          <button onClick={() => updateParams({ view: "grid" })} className={cn("h-12 rounded-2xl border px-4 py-3 text-sm font-medium", view === "grid" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]")}>Grid</button>
          <button onClick={() => updateParams({ view: "list" })} className={cn("h-12 rounded-2xl border px-4 py-3 text-sm font-medium", view === "list" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]")}>List</button>
        </div>
      </div>

      <div className={cn("grid gap-4", view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
        {currentMembers.map((member) => (
          <article key={member.id} className={cn("soft-card rounded-[24px] p-5", view === "list" && "md:flex md:items-start md:justify-between md:gap-6")}>
            {view === "grid" ? (
              <>
                <div className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb]">
                  <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} className="h-56 w-full rounded-none ring-0" />
                </div>
                <div className="mt-4 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--foreground)]">{member.fullName}</h3>
                    </div>
                    <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-[var(--muted)]">{member.email}</p>
                    <p className="font-medium text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <StatusChip label={member.verification.mobileVerified ? "Mobile verified" : "Mobile pending"} tone={member.verification.mobileVerified ? "success" : "warning"} />
                      <StatusChip label={member.verification.emailVerified ? "Email verified" : "Email pending"} tone={member.verification.emailVerified ? "success" : "warning"} />
                      <StatusChip label={member.verification.selfieUploaded ? "Selfie uploaded" : "Selfie pending"} tone={member.verification.selfieUploaded ? "success" : "warning"} />
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Link href={`/admin/members/${member.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">View</Link>
                    <Link href={`/admin/members/${member.id}/edit`} className="rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">Edit</Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex gap-4">
                <AvatarBadge name={member.fullName} photoUrl={member.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{member.fullName}</h3>
                    <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">{member.email}</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusChip label={member.verification.mobileVerified ? "Mobile verified" : "Mobile pending"} tone={member.verification.mobileVerified ? "success" : "warning"} />
                    <StatusChip label={member.verification.emailVerified ? "Email verified" : "Email pending"} tone={member.verification.emailVerified ? "success" : "warning"} />
                    <StatusChip label={member.verification.selfieUploaded ? "Selfie uploaded" : "Selfie pending"} tone={member.verification.selfieUploaded ? "success" : "warning"} />
                  </div>
                </div>
              </div>
            )}
            {view === "list" ? (
              <div className="mt-4 flex gap-2 md:mt-0 md:flex-col">
                <Link href={`/admin/members/${member.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">View</Link>
                <Link href={`/admin/members/${member.id}/edit`} className="rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">Edit</Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {currentMembers.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted)]">
          No members match this search. Try a different name, membership ID, or mobile number.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted)]">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, currentTotal)} of {currentTotal} members
        </p>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
          <button disabled={currentPage === pageCount} onClick={() => updateParams({ page: Math.min(pageCount, currentPage + 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
