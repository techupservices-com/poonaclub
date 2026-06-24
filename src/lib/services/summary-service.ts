import { getRequiredSupabaseClient, type MemberAdminReviewRow, type ProfileRow } from "@/lib/services/shared-db";
import { normalizeMobile } from "@/lib/utils";

function buildPublicSelfieUrl(filePath: string | null) {
  if (!filePath) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/storage/v1/object/public/member-selfies/${filePath}`;
}

function computeProfileComplete(profile: ProfileRow) {
  return Boolean(
    profile.membership_id &&
      profile.full_name &&
      profile.email &&
      profile.current_mobile,
  );
}

export async function buildVerificationSnapshotRow(profileId: string) {
  const client = getRequiredSupabaseClient();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  const row = profile as ProfileRow;
  const normalizedMobile = normalizeMobile(row.current_mobile ?? "");

  const [selfieRes, sharedRes, ownerRes, reviewRes] = await Promise.all([
    client
      .from("member_documents")
      .select("id,file_path")
      .eq("profile_id", profileId)
      .eq("document_type", "selfie")
      .limit(1)
      .maybeSingle(),
    normalizedMobile
      ? client.from("profiles").select("id", { count: "exact", head: true }).eq("current_mobile", normalizedMobile)
      : Promise.resolve({ count: 0, error: null } as const),
    normalizedMobile
      ? client.from("mobile_login_owners").select("profile_id").eq("mobile", normalizedMobile).maybeSingle()
      : Promise.resolve({ data: null, error: null } as const),
    client.from("member_admin_reviews").select("*").eq("profile_id", profileId).maybeSingle(),
  ]);

  if (selfieRes.error) throw selfieRes.error;
  if (sharedRes.error) throw sharedRes.error;
  if (ownerRes.error) throw ownerRes.error;
  if (reviewRes.error) throw reviewRes.error;

  const selfieUploaded = Boolean(selfieRes.data);
  const profileComplete = computeProfileComplete(row);
  const sharedMobileCount = sharedRes.count ?? 0;
  const ownerProfileId = ownerRes.data?.profile_id ?? null;
  const isMobileLoginOwner = ownerProfileId === row.id;
  const sharedMobilePending = sharedMobileCount > 1 && ownerProfileId !== row.id;
  const completed =
    Boolean(row.mobile_verified) &&
    Boolean(row.email_verified) &&
    selfieUploaded &&
    profileComplete &&
    !sharedMobilePending;
  const review = (reviewRes.data as MemberAdminReviewRow | null) ?? null;
  const adminReviewStatus = review?.status ?? "pending";
  const adminReviewedAt = review?.approved_at ?? review?.disapproved_at ?? null;

  return {
    profile_id: row.id,
    membership_id: row.membership_id,
    full_name: row.full_name,
    member_type: row.member_type,
    status: row.status,
    current_mobile: row.current_mobile,
    email: row.email,
    mobile_verified: Boolean(row.mobile_verified),
    email_verified: Boolean(row.email_verified),
    selfie_uploaded: selfieUploaded,
    profile_complete: profileComplete,
    shared_mobile_count: sharedMobileCount,
    owner_profile_id: ownerProfileId,
    is_mobile_login_owner: isMobileLoginOwner,
    shared_mobile_pending: sharedMobilePending,
    completed,
    admin_review_status: adminReviewStatus,
    admin_reviewed_at: adminReviewedAt,
    admin_rejection_steps: review?.disapproved_steps ?? [],
    admin_rejection_message: review?.disapproval_message ?? null,
    photo_public_url: buildPublicSelfieUrl(row.photo_url ?? (selfieRes.data?.file_path ?? null)),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertVerificationSnapshot(profileId: string) {
  const client = getRequiredSupabaseClient();
  const row = await buildVerificationSnapshotRow(profileId);
  if (!row) return null;

  const { data, error } = await client
    .from("member_verification_snapshot")
    .upsert(row, { onConflict: "profile_id" })
    .select("profile_id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertVerificationSnapshots(profileIds: string[]) {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];
  const results = [];
  for (const profileId of uniqueIds) {
    const row = await upsertVerificationSnapshot(profileId);
    if (row) results.push(row);
  }
  return results;
}

export async function rebuildAllVerificationSnapshots() {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("profiles").select("id");
  if (error) throw error;
  const profileIds = (data ?? []).map((row) => row.id as string);
  return upsertVerificationSnapshots(profileIds);
}
