import { listAuditLogs } from "@/lib/services/audit-service";
import { getMembersByIdsBasic } from "@/lib/services/member-service";
import type { MemberWithVerification } from "@/lib/types";
import { getRequiredSupabaseClient, type MemberVerificationSnapshotRow } from "@/lib/services/shared-db";

type FilterKey = "verified" | "pending" | "shared";

const IST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function buildPublicSelfieUrl(filePath?: string | null) {
  if (!filePath) return undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return undefined;
  return `${baseUrl}/storage/v1/object/public/member-selfies/${filePath}`;
}

function formatAuditTimestampToIST(value: string) {
  return IST_DATE_TIME_FORMATTER.format(new Date(value));
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
  const start = (page - 1) * pageSize;
  const sortConfig = getSummarySortColumn(sort);

  const pageQuery = applySummaryQueryFilters(
    client
      .from("member_verification_snapshot")
      .select("profile_id,membership_id,full_name,member_type,email,current_mobile,photo_public_url,photo_thumbnail_url,profile_complete,mobile_verified,email_verified,selfie_uploaded,shared_mobile_count,completed", { count: "exact" })
      .order(sortConfig.column, { ascending: sortConfig.ascending })
      .range(start, start + pageSize - 1),
    query,
    filters,
  );

  const [pageRes, allCountRes, verifiedCountRes, pendingCountRes, sharedCountRes] = await Promise.all([
    pageQuery,
    applySummaryQueryFilters(client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }), query, []),
    applySummaryQueryFilters(client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }), query, ["verified"]),
    applySummaryQueryFilters(client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }), query, ["pending"]),
    applySummaryQueryFilters(client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }), query, ["shared"]),
  ]);

  if (pageRes.error) throw pageRes.error;
  if (allCountRes.error) throw allCountRes.error;
  if (verifiedCountRes.error) throw verifiedCountRes.error;
  if (pendingCountRes.error) throw pendingCountRes.error;
  if (sharedCountRes.error) throw sharedCountRes.error;

  const pagedMembers: MemberWithVerification[] = ((pageRes.data ?? []) as MemberVerificationSnapshotRow[]).map((row) => ({
    id: row.profile_id,
    membershipId: row.membership_id ?? row.profile_id,
    prefix: "",
    fullName: row.full_name ?? "Unknown member",
    memberType: row.member_type ?? "",
    status: row.status ?? "",
    email: row.email ?? "",
    emailVerified: row.email_verified,
    currentMobile: row.current_mobile ?? "",
    mobileVerified: row.mobile_verified,
    dateOfBirth: "1970-01-01",
    joinedAt: row.updated_at,
    city: "",
    pincode: "",
    address1: "",
    address2: "",
    address3: "",
    photoUrl: row.photo_thumbnail_url ?? row.photo_public_url ?? undefined,
    role: "member",
    linkedMemberCount: row.shared_mobile_count,
    verification: {
      profileConfirmed: row.profile_complete,
      mobileVerified: row.mobile_verified,
      emailVerified: row.email_verified,
      selfieUploaded: row.selfie_uploaded,
      documentUploaded: true,
      completed: row.completed,
    },
  }));

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
  const client = getRequiredSupabaseClient();
  const start = (page - 1) * pageSize;
  const [pageRes, countRes] = await Promise.all([
    client
      .from("member_verification_snapshot")
      .select("profile_id,full_name,membership_id,selfie_uploaded")
      .eq("selfie_uploaded", false)
      .order("full_name", { ascending: true })
      .range(start, start + pageSize - 1),
    client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }).eq("selfie_uploaded", false),
  ]);
  if (pageRes.error) throw pageRes.error;
  if (countRes.error) throw countRes.error;
  return {
    items: ((pageRes.data ?? []) as MemberVerificationSnapshotRow[]).map((row) => ({
      id: row.profile_id,
      fullName: row.full_name ?? "Unknown member",
      membershipId: row.membership_id ?? row.profile_id,
      selfieUploaded: row.selfie_uploaded,
    })),
    total: countRes.count ?? 0,
  };
}

export async function getAdminOverviewSummary() {
  const client = getRequiredSupabaseClient();
  const [allRes, verifiedRes, pendingRes, sharedRowsRes] = await Promise.all([
    client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }),
    client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }).eq("completed", true),
    client.from("member_verification_snapshot").select("profile_id", { count: "exact", head: true }).eq("completed", false),
    client.from("member_verification_snapshot").select("current_mobile").gt("shared_mobile_count", 1),
  ]);
  if (allRes.error) throw allRes.error;
  if (verifiedRes.error) throw verifiedRes.error;
  if (pendingRes.error) throw pendingRes.error;
  if (sharedRowsRes.error) throw sharedRowsRes.error;

  return {
    totalMembers: allRes.count ?? 0,
    verified: verifiedRes.count ?? 0,
    sharedMobileGroups: new Set((sharedRowsRes.data ?? []).map((row) => row.current_mobile ?? "")).size,
    needsAction: pendingRes.count ?? 0,
  };
}

export async function getMemberPreviewData(limit: number) {
  const client = getRequiredSupabaseClient();
  try {
    const { data, error } = await client
      .from("member_verification_snapshot")
      .select("profile_id,full_name,membership_id,current_mobile,photo_public_url,photo_thumbnail_url,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return {
      members: (data ?? []).map((row) => ({
        id: row.profile_id as string,
        fullName: row.full_name as string,
        membershipId: row.membership_id as string,
        currentMobile: (row.current_mobile as string | null) ?? "",
        photoUrl: ((row.photo_thumbnail_url as string | null) ?? (row.photo_public_url as string | null)) ?? undefined,
      })),
    };
  } catch {
    const idsRes = await client.from("profiles").select("id").order("updated_at", { ascending: false }).limit(limit);
    if (idsRes.error) throw idsRes.error;
    const ids = (idsRes.data ?? []).map((row) => row.id as string);
    const sorted = await getMembersByIdsBasic(ids);
    const withPhotos = sorted.slice(0, limit).map((member) => ({
      ...member,
      photoUrl: member.photoUrl?.startsWith("http") ? member.photoUrl : buildPublicSelfieUrl(member.photoUrl),
    }));
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
