import { listAuditLogs } from "@/lib/services/audit-service";
import { listMembersWithVerification } from "@/lib/services/member-service";
import type { MemberWithVerification } from "@/lib/types";

function matchesMemberFilters(
  member: MemberWithVerification,
  query: string,
  filters: Array<"verified" | "pending" | "shared">,
) {
  const value = query.trim().toLowerCase();
  const matchesQuery =
    !value || [member.fullName, member.membershipId, member.currentMobile, member.email].join(" ").toLowerCase().includes(value);

  const matchesFilter =
    filters.length === 0 ||
    filters.every((filter) => {
      if (filter === "verified") return member.verification.completed;
      if (filter === "pending") return !member.verification.completed;
      if (filter === "shared") return member.linkedMemberCount > 1;
      return true;
    });

  return matchesQuery && matchesFilter;
}

function sortMembers(members: MemberWithVerification[], sort: string) {
  const copy = [...members];
  copy.sort((left, right) => {
    switch (sort) {
      case "name_desc":
        return right.fullName.localeCompare(left.fullName);
      case "membership_asc":
        return left.membershipId.localeCompare(right.membershipId);
      case "membership_desc":
        return right.membershipId.localeCompare(left.membershipId);
      case "updated_desc":
        return right.joinedAt.localeCompare(left.joinedAt);
      case "name_asc":
      default:
        return left.fullName.localeCompare(right.fullName);
    }
  });
  return copy;
}

export async function getMemberDirectoryData({
  page,
  pageSize,
  query,
  filters,
  sort,
}: {
  page: number;
  pageSize: number;
  query: string;
  filters: Array<"verified" | "pending" | "shared">;
  sort: string;
}) {
  const members = await listMembersWithVerification();
  const filtered = sortMembers(members.filter((member) => matchesMemberFilters(member, query, filters)), sort);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pagedMembers = filtered.slice(start, start + pageSize);

  return {
    members: pagedMembers,
    total,
    counts: {
      all: members.filter((member) => matchesMemberFilters(member, query, [])).length,
      verified: members.filter((member) => matchesMemberFilters(member, query, ["verified"])).length,
      pending: members.filter((member) => matchesMemberFilters(member, query, ["pending"])).length,
      shared: members.filter((member) => matchesMemberFilters(member, query, ["shared"])).length,
    },
  };
}

export async function getAuditHistoryData({ page, pageSize }: { page: number; pageSize: number }) {
  const audits = await listAuditLogs();
  const members = await listMembersWithVerification();
  const memberMap = new Map(
    members.map((member) => [member.id, { memberName: member.fullName, membershipId: member.membershipId, mobile: member.currentMobile }]),
  );

  const items = audits.map((entry) => {
    const target = memberMap.get(entry.targetProfileId);
    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      createdAt: entry.createdAt,
      targetProfileId: entry.targetProfileId,
      memberName: target?.memberName ?? "Unknown member",
      membershipId: target?.membershipId ?? entry.targetProfileId,
      mobile: target?.mobile ?? "",
    };
  });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total };
}

export async function getSelfieQueueData({ page, pageSize }: { page: number; pageSize: number }) {
  const members = await listMembersWithVerification();
  const pending = members.filter((member) => !member.verification.selfieUploaded);
  const total = pending.length;
  const start = (page - 1) * pageSize;
  return {
    items: pending.slice(start, start + pageSize).map((member) => ({
      id: member.id,
      fullName: member.fullName,
      membershipId: member.membershipId,
      selfieUploaded: member.verification.selfieUploaded,
    })),
    total,
  };
}
