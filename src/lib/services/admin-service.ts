import { listAuditLogs } from "@/lib/services/audit-service";
import { createSignedStorageUrl } from "@/lib/services/document-service";
import { getMembersByIdsBasic, listMembersWithVerification } from "@/lib/services/member-service";
import type { MemberWithVerification } from "@/lib/types";
import { fetchAllRows, getRequiredSupabaseClient, type MemberVerificationSnapshotRow, type MemberVerificationSummaryRow } from "@/lib/services/shared-db";
import { SELFIE_BUCKET } from "@/lib/constants";

type FilterKey = "verified" | "pending" | "shared";

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
    return await fetchAllRows<MemberVerificationSnapshotRow>("member_verification_snapshot", "*", "full_name");
  } catch {
    try {
      return await fetchAllRows<MemberVerificationSummaryRow>("member_verification_summary", "*", "full_name");
    } catch {
      return null;
    }
  }
}

function matchesSummaryFilters(
  row: MemberVerificationSummaryRow | MemberVerificationSnapshotRow,
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

function sortSummary(rows: Array<MemberVerificationSummaryRow | MemberVerificationSnapshotRow>, sort: string) {
  const copy = [...rows];
  copy.sort((left, right) => {
    const leftName = left.full_name ?? "";
    const rightName = right.full_name ?? "";
    const leftMembership = left.membership_id ?? "";
    const rightMembership = right.membership_id ?? "";
    switch (sort) {
      case "name_desc":
        return rightName.localeCompare(leftName);
      case "membership_asc":
        return leftMembership.localeCompare(rightMembership);
      case "membership_desc":
        return rightMembership.localeCompare(leftMembership);
      case "updated_desc":
        return rightMembership.localeCompare(leftMembership);
      case "name_asc":
      default:
        return leftName.localeCompare(rightName);
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

function applySummaryQueryFilters<T>(queryBuilder: T, query: string, filters: FilterKey[]) {
  let qb = queryBuilder as {
    or: (filter: string) => typeof queryBuilder;
    eq: (column: string, value: unknown) => typeof queryBuilder;
    gt: (column: string, value: number) => typeof queryBuilder;
  };
  const search = query.trim();

  if (search) {
    const value = `%${search}%`;
    qb = qb.or(
      `full_name.ilike.${value},membership_id.ilike.${value},current_mobile.ilike.${value},email.ilike.${value}`,
    ) as typeof qb;
  }

  if (filters.includes("verified")) qb = qb.eq("completed", true) as typeof qb;
  if (filters.includes("pending")) qb = qb.eq("completed", false) as typeof qb;
  if (filters.includes("shared")) qb = qb.gt("shared_mobile_count", 1) as typeof qb;

  return qb as T;
}

function getSummarySortColumn(sort: string) {
  switch (sort) {
    case "name_desc":
    case "name_asc":
      return { column: "full_name", ascending: sort === "name_asc" };
    case "membership_asc":
    case "membership_desc":
      return { column: "membership_id", ascending: sort === "membership_asc" };
    default:
      return { column: "membership_id", ascending: true };
  }
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
  filters: FilterKey[];
  sort: string;
}) {
  const client = getRequiredSupabaseClient();
  try {
    const start = (page - 1) * pageSize;
    const sortConfig = getSummarySortColumn(sort);

    const pageQuery = applySummaryQueryFilters(
      client
        .from("member_verification_summary")
        .select("*", { count: "exact" })
        .order(sortConfig.column, { ascending: sortConfig.ascending })
        .range(start, start + pageSize - 1),
      query,
      filters,
    );

    const [pageRes, allCountRes, verifiedCountRes, pendingCountRes, sharedCountRes] = await Promise.all([
      pageQuery,
      applySummaryQueryFilters(client.from("member_verification_summary").select("profile_id", { count: "exact", head: true }), query, []),
      applySummaryQueryFilters(client.from("member_verification_summary").select("profile_id", { count: "exact", head: true }), query, ["verified"]),
      applySummaryQueryFilters(client.from("member_verification_summary").select("profile_id", { count: "exact", head: true }), query, ["pending"]),
      applySummaryQueryFilters(client.from("member_verification_summary").select("profile_id", { count: "exact", head: true }), query, ["shared"]),
    ]);

    if (pageRes.error) throw pageRes.error;
    if (allCountRes.error) throw allCountRes.error;
    if (verifiedCountRes.error) throw verifiedCountRes.error;
    if (pendingCountRes.error) throw pendingCountRes.error;
    if (sharedCountRes.error) throw sharedCountRes.error;

    const pageRows = (pageRes.data ?? []) as MemberVerificationSummaryRow[];
    const basicMembers = await getMembersByIdsBasic(pageRows.map((row) => row.profile_id));
    const summaryMap = new Map(pageRows.map((row) => [row.profile_id, row]));

    const pagedMembers: MemberWithVerification[] = await Promise.all(
      basicMembers.map(async (member) => {
        const summaryRow = summaryMap.get(member.id);
        const signedPhoto =
          member.photoUrl && !member.photoUrl.startsWith("http")
            ? await createSignedStorageUrl(SELFIE_BUCKET, member.photoUrl)
            : member.photoUrl ?? null;

        return {
          ...member,
          photoUrl: signedPhoto ?? undefined,
          linkedMemberCount: summaryRow?.shared_mobile_count ?? 0,
          verification: {
            profileConfirmed: summaryRow?.profile_complete ?? false,
            mobileVerified: summaryRow?.mobile_verified ?? false,
            emailVerified: summaryRow?.email_verified ?? false,
            selfieUploaded: summaryRow?.selfie_uploaded ?? false,
            documentUploaded: true,
            completed: summaryRow?.completed ?? false,
          },
        };
      }),
    );

    return {
      members: pagedMembers,
      total: pageRes.count ?? 0,
      counts: {
        all: allCountRes.count ?? 0,
        verified: verifiedCountRes.count ?? 0,
        pending: pendingCountRes.count ?? 0,
        shared: sharedCountRes.count ?? 0,
      },
    };
  } catch {
    const summary = await listVerificationSummary();
    if (summary) {
      const filteredSummary = sortSummary(summary.filter((row) => matchesSummaryFilters(row, query, filters)), sort);
      const total = filteredSummary.length;
      const start = (page - 1) * pageSize;
      const pageRows = filteredSummary.slice(start, start + pageSize);
      const basicMembers = await getMembersByIdsBasic(pageRows.map((row) => row.profile_id));
      const summaryMap = new Map(pageRows.map((row) => [row.profile_id, row]));

      const pagedMembers: MemberWithVerification[] = await Promise.all(
        basicMembers.map(async (member) => {
          const summaryRow = summaryMap.get(member.id);
          const signedPhoto =
            member.photoUrl && !member.photoUrl.startsWith("http")
              ? await createSignedStorageUrl(SELFIE_BUCKET, member.photoUrl)
              : member.photoUrl ?? null;

          return {
            ...member,
            photoUrl: signedPhoto ?? undefined,
            linkedMemberCount: summaryRow?.shared_mobile_count ?? 0,
            verification: {
              profileConfirmed: summaryRow?.profile_complete ?? false,
              mobileVerified: summaryRow?.mobile_verified ?? false,
              emailVerified: summaryRow?.email_verified ?? false,
              selfieUploaded: summaryRow?.selfie_uploaded ?? false,
              documentUploaded: true,
              completed: summaryRow?.completed ?? false,
            },
          };
        }),
      );

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
        fullName: row.full_name ?? "Unknown member",
        membershipId: row.membership_id ?? row.profile_id,
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
    return {
      totalMembers: summary.length,
      verified: summary.filter((row) => row.completed).length,
      sharedMobileGroups: new Set(summary.filter((row) => row.shared_mobile_count > 1).map((row) => row.current_mobile ?? "")).size,
      needsAction: summary.filter((row) => !row.completed).length,
    };
  }

  const members = await listMembersWithVerification();
  return {
    totalMembers: members.length,
    verified: members.filter((member) => member.verification.completed).length,
    sharedMobileGroups: new Set(members.filter((member) => member.linkedMemberCount > 1).map((member) => member.currentMobile)).size,
    needsAction: members.filter((member) => !member.verification.completed).length,
  };
}

export async function getMemberPreviewData(limit: number) {
  const client = getRequiredSupabaseClient();
  try {
    const { data, error } = await client
      .from("member_verification_snapshot")
      .select("profile_id,full_name,membership_id,current_mobile,photo_public_url,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return {
      members: (data ?? []).map((row) => ({
        id: row.profile_id as string,
        fullName: row.full_name as string,
        membershipId: row.membership_id as string,
        currentMobile: (row.current_mobile as string | null) ?? "",
        photoUrl: (row.photo_public_url as string | null) ?? undefined,
      })),
    };
  } catch {
    const idsRes = await client.from("profiles").select("id").order("updated_at", { ascending: false }).limit(limit);
    if (idsRes.error) throw idsRes.error;
    const ids = (idsRes.data ?? []).map((row) => row.id as string);
    const sorted = await getMembersByIdsBasic(ids);
    const withPhotos = await Promise.all(
      sorted.slice(0, limit).map(async (member) => ({
        ...member,
        photoUrl:
          member.photoUrl && !member.photoUrl.startsWith("http")
            ? (await createSignedStorageUrl(SELFIE_BUCKET, member.photoUrl)) ?? undefined
            : member.photoUrl,
      })),
    );
    return {
      members: withPhotos.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        membershipId: member.membershipId,
        currentMobile: member.currentMobile,
        photoUrl: member.photoUrl,
      })),
    };
  }
}

export async function getAdminHomepageData() {
  const [overview, memberPreview, recentAudit] = await Promise.all([
    getAdminOverviewSummary(),
    getMemberPreviewData(4),
    getRecentAuditPreviewData(4),
  ]);

  return {
    counts: {
      totalMembers: overview.totalMembers,
      verified: overview.verified,
      sharedMobileGroups: overview.sharedMobileGroups,
      needsAction: overview.needsAction,
    },
    members: memberPreview.members,
    recentAuditItems: recentAudit.items,
  };
}
