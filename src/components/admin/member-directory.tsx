"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvatarBadge } from "@/components/shared/avatar-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { PAGE_SIZE } from "@/lib/constants";
import type { MemberWithVerification } from "@/lib/types";
import { cn, formatMobile } from "@/lib/utils";

export function MemberDirectory({ members }: { members: MemberWithVerification[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<Array<"verified" | "pending" | "shared">>([]);
  const [page, setPage] = useState(1);

  const filterCounts = useMemo(
    () => ({
      all: members.length,
      verified: members.filter((member) => member.verification.completed).length,
      pending: members.filter((member) => !member.verification.completed).length,
      shared: members.filter((member) => member.linkedMemberCount > 1).length,
    }),
    [members],
  );

  const filterOptions = [
    { value: "verified", label: "Verified", count: filterCounts.verified },
    { value: "pending", label: "Pending", count: filterCounts.pending },
    { value: "shared", label: "Shared mobile", count: filterCounts.shared },
  ] as const;

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        !value ||
        [member.fullName, member.membershipId, member.currentMobile]
          .join(" ")
          .toLowerCase()
          .includes(value);

      const matchesFilter =
        filters.length === 0 ||
        filters.every((filter) => {
          if (filter === "verified") return member.verification.completed;
          if (filter === "pending") return !member.verification.completed;
          if (filter === "shared") return member.linkedMemberCount > 1;
          return true;
        });

      return matchesQuery && matchesFilter;
    });
  }, [filters, members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedMembers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="grid gap-5">
      <div className="shell-panel rounded-[24px] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setFilters([]);
              setPage(1);
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
              filters.length === 0
                ? "border-[#6f84ba] bg-[#3c589e] text-white"
                : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
            )}
          >
            <span>All members</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                filters.length === 0 ? "bg-white/18 text-white" : "bg-[#eef2fb] text-[#3c589e]",
              )}
            >
              {filterCounts.all}
            </span>
          </button>

          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setFilters((current) =>
                  current.includes(option.value)
                    ? current.filter((value) => value !== option.value)
                    : [...current, option.value],
                );
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                filters.includes(option.value)
                  ? "border-[#6f84ba] bg-[#3c589e] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]",
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  filters.includes(option.value)
                    ? "bg-white/18 text-white"
                    : "bg-[#eef2fb] text-[#3c589e]",
                )}
              >
                {option.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Member directory</p>
            <label htmlFor="member-search" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Search by member name, membership ID or mobile number
            </label>
            <input
              id="member-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search members"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--foreground)]"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Combine filters to narrow the list, such as pending members with shared mobile numbers.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setView("grid")} className={cn("rounded-full border px-4 py-2 text-sm font-medium", view === "grid" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)]")}>Grid</button>
              <button onClick={() => setView("list")} className={cn("rounded-full border px-4 py-2 text-sm font-medium", view === "list" ? "border-[#6f84ba] bg-[#3c589e] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)]")}>List</button>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("grid gap-4", view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
        {pagedMembers.map((member) => (
          <article key={member.id} className={cn("soft-card rounded-[24px] p-5", view === "list" && "md:flex md:items-start md:justify-between md:gap-6")}>
            <div className="flex gap-4">
              <AvatarBadge name={member.fullName} />
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
            <div className="mt-4 flex gap-2 md:mt-0 md:flex-col">
              <Link href={`/admin/members/${member.id}`} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[#6f84ba] hover:bg-[#eef2fb]">View</Link>
              <Link href={`/admin/members/${member.id}/edit`} className="rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">Edit</Link>
            </div>
          </article>
        ))}
      </div>

      {pagedMembers.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted)]">
          No members match this search. Try a different name, membership ID, or mobile number.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-white/80 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--muted)]">
          Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} members
        </p>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Previous</button>
          <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
