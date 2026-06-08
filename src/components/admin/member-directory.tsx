"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { StatusChip } from "@/components/shared/status-chip";
import type { MemberWithVerification } from "@/lib/types";
import { cn, formatMobile } from "@/lib/utils";

type FilterKey = "verified" | "pending" | "shared";

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
  counts: { all: number; verified: number; pending: number; shared: number };
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
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

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
    { value: "verified" as const, label: "Verified", count: counts.verified },
    { value: "pending" as const, label: "Pending", count: counts.pending },
    { value: "shared" as const, label: "Shared mobile", count: counts.shared },
  ];

  return (
    <div className="grid gap-5">
      <div className="shell-panel rounded-[24px] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
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
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", filters.length === 0 ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{counts.all}</span>
          </button>

          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                const nextFilters = filters.includes(option.value)
                  ? filters.filter((value) => value !== option.value)
                  : [...filters, option.value];
                updateParams({ filters: nextFilters, page: 1 });
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                filters.includes(option.value)
                  ? "border-[#6f84ba] bg-[#3c589e] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
              )}
            >
              <span>{option.label}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", filters.includes(option.value) ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]")}>{option.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member directory</p>
            <label htmlFor="member-search" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Search by member name, membership ID or mobile number
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="member-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") updateParams({ q: search.trim(), page: 1 });
                }}
                placeholder="Search members"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
              />
              <button
                onClick={() => updateParams({ q: search.trim(), page: 1 })}
                className="rounded-2xl bg-[#3c589e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2f467e]"
              >
                Search
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Combine filters to narrow the list, such as pending members with shared mobile numbers.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateParams({ view: "grid" })} className={cn("rounded-full border px-4 py-2 text-sm font-medium", view === "grid" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)]")}>Grid</button>
              <button onClick={() => updateParams({ view: "list" })} className={cn("rounded-full border px-4 py-2 text-sm font-medium", view === "list" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)]")}>List</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-4", view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
        {members.map((member) => (
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
                      <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                    </div>
                    <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-[var(--muted)]">{member.email}</p>
                    <p className="leading-6 text-[var(--muted)]">{member.address1}, {member.address2}, {member.city} {member.pincode}</p>
                    <p className="font-medium text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{member.fullName}</h3>
                    <StatusChip label={member.verification.completed ? "Verified" : "In progress"} tone={member.verification.completed ? "success" : "warning"} />
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{member.membershipId} · {member.memberType}</p>
                  <p className="mt-3 text-sm text-[var(--muted)]">{member.email}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{member.address1}, {member.address2}, {member.city} {member.pincode}</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{formatMobile(member.currentMobile)}</p>
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

      {members.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted)]">
          No members match this search. Try a different name, membership ID, or mobile number.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted)]">
          Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} of {total} members
        </p>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
          <button disabled={currentPage === pageCount} onClick={() => updateParams({ page: Math.min(pageCount, currentPage + 1) })} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
