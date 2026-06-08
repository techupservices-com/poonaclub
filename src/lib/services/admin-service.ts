import { listAuditLogs } from "@/lib/services/audit-service";
import { getMembersByIdsBasic, getMembersByIdsWithVerification, listMembersWithVerification } from "@/lib/services/member-service";
import type { MemberWithVerification } from "@/lib/types";
import { fetchAllRows, type MemberVerificationSummaryRow } from "@/lib/services/shared-db";

const IST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function formatAuditTimestampToIST(value: string) {
  return IST_DATE_TIME_FORMATTER.format(new Date(value));
}

async function listVerificationSummary() {
  try {
    return await fetchAllRows<MemberVerificationSummaryRow>("member_verification_summary", "*", "full_name");
  } catch {
    return null;
  }
}

function matchesSummaryFilters(
  row: MemberVerificationSummaryRow,
  query: string,
  filters: Array<"verified" | "pending" | "shared">,
) {
  const value = query.trim().toLowerCase();
  const matchesQuery =
    !value || [row.full_name, row.membership_id, row.current_mobile ?? "", row.email ?? ""].join(" ").toLowerCase().includes(value);

  const matchesFilter =
    filters.length === 0 ||
    filters.every((filter) => {
      if (filter === "verified") return row.completed;
      if (filter === "pending") return !row.completed;
      if (filter === "shared") return row.shared_mobile_count > 1;
      return true;
    });

  return matchesQuery && matchesFilter;
}

function sortSummary(rows: MemberVerificationSummaryRow[], sort: string) {
  const copy = [...rows];
  copy.sort((left, right) => {
    switch (sort) {
      case "name_desc":
        return right.full_name.localeCompare(left.full_name);
      case "membership_asc":
        return left.membership_id.localeCompare(right.membership_id);
      case "membership_desc":
        return right.membership_id.localeCompare(left.membership_id);
      case "updated_desc":
        return right.membership_id.localeCompare(left.membership_id);
      case "name_asc":
      default:
        return left.full_name.localeCompare(right.full_name);
    }
  });
  return copy;
}

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
  const summary = await listVerificationSummary();
  if (summary) {
    const filteredSummary = sortSummary(summary.filter((row) => matchesSummaryFilters(row, query, filters)), sort);
    const total = filteredSummary.length;
    const start = (page - 1) * pageSize;
    const pageRows = filteredSummary.slice(start, start + pageSize);
    const pagedMembers = await getMembersByIdsWithVerification(pageRows.map((row) => row.profile_id));

    return {
      members: pagedMembers,
      total,
      counts: {
        all: summary.filter((row) => matchesSummaryFilters(row, query, [])).length,
        verified: summary.filter((row) => matchesSummaryFilters(row, query, ["verified"])).length,
        pending: summary.filter((row) => matchesSummaryFilters(row, query, ["pending"])).length,
        shared: summary.filter((row) => matchesSummaryFilters(row, query, ["shared"])).length,
      },
    };
  }

  const members = await listMembersWithVerification();
  const filtered = sortMembers(members.filter((member) => matchesMemberFilters(member, query, filters)), sort);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pagedMembers = filtered.slice(start, start + pageSize);
  const counts = {
    all: members.filter((member) => matchesMemberFilters(member, query, [])).length,
    verified: members.filter((member) => matchesMemberFilters(member, query, ["verified"])).length,
    pending: members.filter((member) => matchesMemberFilters(member, query, ["pending"])).length,
    shared: members.filter((member) => matchesMemberFilters(member, query, ["shared"])).length,
  };

  return {
    members: pagedMembers,
    total,
    counts,
  };
}

export async function getAuditHistoryData({ page, pageSize }: { page: number; pageSize: number }) {
  const audits = await listAuditLogs();
  const total = audits.length;
  const start = (page - 1) * pageSize;
  const pageAudits = audits.slice(start, start + pageSize);
  const targetIds = [...new Set(pageAudits.map((entry) => entry.targetProfileId))];
  const members = await getMembersByIdsBasic(targetIds);
  const memberMap = new Map(
    members.map((member) => [member.id, { memberName: member.fullName, membershipId: member.membershipId, mobile: member.currentMobile }]),
  );

  const items = pageAudits.map((entry) => {
    const target = memberMap.get(entry.targetProfileId);
    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      createdAt: entry.createdAt,
      formattedCreatedAt: formatAuditTimestampToIST(entry.createdAt),
      targetProfileId: entry.targetProfileId,
      memberName: target?.memberName ?? "Unknown member",
      membershipId: target?.membershipId ?? entry.targetProfileId,
      mobile: target?.mobile ?? "",
    };
  });

  return { items, total };
}

export async function getRecentAuditPreviewData(limit: number) {
  const audits = await listAuditLogs();
  const pageAudits = audits.slice(0, limit);
  const targetIds = [...new Set(pageAudits.map((entry) => entry.targetProfileId))];
  const members = await getMembersByIdsBasic(targetIds);
  const memberMap = new Map(
    members.map((member) => [member.id, { memberName: member.fullName, membershipId: member.membershipId, mobile: member.currentMobile }]),
  );

  const items = pageAudits.map((entry) => {
    const target = memberMap.get(entry.targetProfileId);
    return {
      id: entry.id,
      action: entry.action,
      actorType: entry.actorType,
      createdAt: entry.createdAt,
      formattedCreatedAt: formatAuditTimestampToIST(entry.createdAt),
      memberName: target?.memberName ?? "Unknown member",
      membershipId: target?.membershipId ?? entry.targetProfileId,
      mobile: target?.mobile ?? "",
    };
  });

  return { items };
}

export async function getSelfieQueueData({ page, pageSize }: { page: number; pageSize: number }) {
  const summary = await listVerificationSummary();
  if (summary) {
    const pending = summary.filter((row) => !row.selfie_uploaded);
    const total = pending.length;
    const start = (page - 1) * pageSize;
    return {
      items: pending.slice(start, start + pageSize).map((row) => ({
        id: row.profile_id,
        fullName: row.full_name,
        membershipId: row.membership_id,
        selfieUploaded: row.selfie_uploaded,
      })),
      total,
    };
  }

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

export async function getAdminOverviewSummary() {
  const summary = await listVerificationSummary();
  if (summary) {
    const members = await getMembersByIdsWithVerification(summary.slice(0, 4).map((row) => row.profile_id));
    return {
      totalMembers: summary.length,
      verified: summary.filter((row) => row.completed).length,
      sharedMobileGroups: new Set(summary.filter((row) => row.shared_mobile_count > 1).map((row) => row.current_mobile ?? "")).size,
      needsAction: summary.filter((row) => !row.completed).length,
      members,
    };
  }

  const members = await listMembersWithVerification();
  return {
    totalMembers: members.length,
    verified: members.filter((member) => member.verification.completed).length,
    sharedMobileGroups: new Set(members.filter((member) => member.linkedMemberCount > 1).map((member) => member.currentMobile)).size,
    needsAction: members.filter((member) => !member.verification.completed).length,
    members,
  };
}

export async function getMemberPreviewData(limit: number) {
  const summary = await listVerificationSummary();
  if (summary) {
    const members = await getMembersByIdsWithVerification(summary.slice(0, limit).map((row) => row.profile_id));
    return {
      members: members.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        membershipId: member.membershipId,
        currentMobile: member.currentMobile,
        photoUrl: member.photoUrl,
      })),
    };
  }

  const members = await listMembersWithVerification();
  return {
    members: members.slice(0, limit).map((member) => ({
      id: member.id,
      fullName: member.fullName,
      membershipId: member.membershipId,
      currentMobile: member.currentMobile,
      photoUrl: member.photoUrl,
    })),
  };
}
