import type { AdminSelectionMode, MemberDirectoryFilterKey } from "@/lib/types";
import { getRequiredSupabaseClient, type MemberVerificationSnapshotRow } from "@/lib/services/shared-db";

const DB_BATCH_SIZE = 1000;

function applyDirectoryFilters<T>(queryBuilder: T, query: string, filters: MemberDirectoryFilterKey[]) {
  let qb = queryBuilder as {
    or: (filter: string) => typeof queryBuilder;
    eq: (column: string, value: unknown) => typeof queryBuilder;
    neq: (column: string, value: unknown) => typeof queryBuilder;
    gt: (column: string, value: number) => typeof queryBuilder;
  };
  const search = query.trim();

  if (search) {
    const value = `%${search}%`;
    qb = qb.or(`full_name.ilike.${value},membership_id.ilike.${value},current_mobile.ilike.${value},email.ilike.${value}`) as typeof qb;
  }

  const isAdminReviewedFilter = filters.includes("approved") || filters.includes("disapproved");
  const excludeAdminReviewed = filters.some((filter) => filter !== "approved" && filter !== "disapproved");

  if (filters.includes("approved")) qb = qb.eq("admin_review_status", "approved") as typeof qb;
  if (filters.includes("disapproved")) qb = qb.eq("admin_review_status", "disapproved") as typeof qb;
  if (excludeAdminReviewed && !isAdminReviewedFilter) {
    qb = qb.neq("admin_review_status", "approved") as typeof qb;
    qb = qb.neq("admin_review_status", "disapproved") as typeof qb;
  }

  if (filters.includes("verified")) qb = qb.eq("completed", true) as typeof qb;
  if (filters.includes("inprogress")) {
    qb = qb.eq("completed", false) as typeof qb;
    qb = qb.or("mobile_verified.eq.true,email_verified.eq.true,selfie_uploaded.eq.true") as typeof qb;
  }
  if (filters.includes("notstarted")) {
    qb = qb.eq("completed", false) as typeof qb;
    qb = qb.eq("mobile_verified", false) as typeof qb;
    qb = qb.eq("email_verified", false) as typeof qb;
    qb = qb.eq("selfie_uploaded", false) as typeof qb;
  }
  if (filters.includes("shared")) qb = qb.gt("shared_mobile_count", 1) as typeof qb;

  return qb as T;
}

export async function resolveAdminSelection(input: {
  selectionMode: AdminSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}) {
  if (input.selectionMode === "selected_ids") {
    return [...new Set(input.selectedIds ?? [])];
  }

  const client = getRequiredSupabaseClient();
  const ids: string[] = [];
  let from = 0;

  while (true) {
    const response = await applyDirectoryFilters(
      client
        .from("member_verification_snapshot")
        .select("profile_id")
        .order("membership_id", { ascending: true })
        .range(from, from + DB_BATCH_SIZE - 1),
      input.query ?? "",
      input.filters ?? [],
    );
    if (response.error) throw response.error;
    const rows = (response.data ?? []) as Pick<MemberVerificationSnapshotRow, "profile_id">[];
    ids.push(...rows.map((row) => row.profile_id));
    if (rows.length < DB_BATCH_SIZE) break;
    from += DB_BATCH_SIZE;
  }

  return ids;
}

export { applyDirectoryFilters };
