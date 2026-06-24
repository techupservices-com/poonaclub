import type { AdminReviewStep, MemberProfile, MemberWithVerification, MobileChangeRequest } from "@/lib/types";
import { normalizeMobile } from "@/lib/utils";
import { computeVerification } from "@/lib/verification";
import {
  fetchAllRows,
  getRequiredSupabaseClient,
  mapMobileChange,
  mapProfile,
  type DocumentRow,
  type MemberAdminReviewRow,
  type MobileChangeRow,
  type OtpRequestRow,
  type ProfileRow,
} from "@/lib/services/shared-db";
import { getMemberProfilePhotoUrl } from "@/lib/services/document-service";

async function getProfilesAndDocuments() {
  const [profiles, documents, otpRequests] = await Promise.all([
    fetchAllRows<ProfileRow>("profiles", "*", "full_name"),
    fetchAllRows<DocumentRow>("member_documents", "*"),
    fetchAllRows<OtpRequestRow>("audit_logs", "target_profile_id,action"),
  ]);

  return { profiles, documents, otpRequests };
}

async function getProfilesAndDocumentsByIds(profileIds: string[]) {
  if (!profileIds.length) {
    return { profiles: [] as ProfileRow[], documents: [] as DocumentRow[], otpRequests: [] as OtpRequestRow[] };
  }

  const client = getRequiredSupabaseClient();
  const [profilesRes, documentsRes, otpRes] = await Promise.all([
    client.from("profiles").select("*").in("id", profileIds),
    client.from("member_documents").select("*").in("profile_id", profileIds),
    client.from("audit_logs").select("target_profile_id,action").in("target_profile_id", profileIds),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (documentsRes.error) throw documentsRes.error;
  if (otpRes.error) throw otpRes.error;

  return {
    profiles: (profilesRes.data ?? []) as ProfileRow[],
    documents: (documentsRes.data ?? []) as DocumentRow[],
    otpRequests: (otpRes.data ?? []) as OtpRequestRow[],
  };
}

function applyAdminReviewToVerification<T extends MemberWithVerification>(member: T, review?: MemberAdminReviewRow | null): T {
  return {
    ...member,
    verification: {
      ...member.verification,
      adminReviewStatus: review?.status ?? "pending",
      adminReviewedAt: review?.approved_at ?? review?.disapproved_at ?? null,
      adminRejectionSteps: (review?.disapproved_steps ?? []) as AdminReviewStep[],
      adminRejectionMessage: review?.disapproval_message ?? null,
    },
  };
}

async function buildMembersWithVerification(
  profiles: ProfileRow[],
  documents: DocumentRow[],
  otpRequests: OtpRequestRow[],
) {
  return Promise.all(
    profiles.map(async (row) => {
      const emailVerified = otpRequests.some(
        (entry) =>
          entry.target_profile_id === row.id &&
          (entry.action === "Verified email via OTP" ||
            entry.action.includes("Verified login email via email OTP")),
      );
      const profile = { ...mapProfile(row), emailVerified };
      const memberDocuments = documents
        .filter((document) => document.profile_id === row.id)
        .map((document) => ({
          id: document.id,
          profileId: document.profile_id,
          documentType: document.document_type,
          documentGroup: document.document_group ?? "legacy",
          documentPart: document.document_part ?? "legacy",
          fileName: document.file_name,
          filePath: document.file_path,
          mimeType: document.mime_type ?? "application/octet-stream",
          uploadedAt: document.uploaded_at,
          documentNumber: document.document_number ?? null,
        }));
      const linkedMemberCount = profiles.filter(
        (candidate) => normalizeMobile(candidate.current_mobile ?? "") === normalizeMobile(row.current_mobile ?? ""),
      ).length;
      const resolvedPhotoUrl = await getMemberProfilePhotoUrl(row.id, row.photo_url ?? undefined);

      return {
        ...profile,
        photoUrl: resolvedPhotoUrl ?? undefined,
        linkedMemberCount,
        verification: computeVerification(profile, memberDocuments),
      } satisfies MemberWithVerification;
    }),
  );
}

function toProfileUpdates(updates: Partial<MemberProfile>) {
  return {
    ...(updates.email !== undefined ? { email: updates.email } : {}),
    ...(updates.emailVerified !== undefined ? { email_verified: updates.emailVerified } : {}),
    ...(updates.currentMobile !== undefined ? { current_mobile: normalizeMobile(updates.currentMobile) } : {}),
    ...(updates.mobileVerified !== undefined ? { mobile_verified: updates.mobileVerified } : {}),
    ...(updates.address1 !== undefined ? { address1: updates.address1 } : {}),
    ...(updates.address2 !== undefined ? { address2: updates.address2 } : {}),
    ...(updates.address3 !== undefined ? { address3: updates.address3 } : {}),
    ...(updates.city !== undefined ? { city: updates.city } : {}),
    ...(updates.pincode !== undefined ? { pincode: updates.pincode } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    updated_at: new Date().toISOString(),
  };
}

export async function listMembersWithVerification() {
  const result = await getProfilesAndDocuments();
  return buildMembersWithVerification(result.profiles, result.documents, result.otpRequests);
}

export async function getMembersByIdsWithVerification(profileIds: string[]) {
  const result = await getProfilesAndDocumentsByIds(profileIds);
  const members = await buildMembersWithVerification(result.profiles, result.documents, result.otpRequests);
  const order = new Map(profileIds.map((id, index) => [id, index]));
  return members.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export async function getMemberById(id: string) {
  const client = getRequiredSupabaseClient();
  const [profileRes, documentsRes, auditRes, reviewRes] = await Promise.all([
    client.from("profiles").select("*").eq("id", id).maybeSingle(),
    client.from("member_documents").select("*").eq("profile_id", id),
    client.from("audit_logs").select("target_profile_id,action").eq("target_profile_id", id),
    client.from("member_admin_reviews").select("*").eq("profile_id", id).maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (documentsRes.error) throw documentsRes.error;
  if (auditRes.error) throw auditRes.error;
  if (reviewRes.error) throw reviewRes.error;
  if (!profileRes.data) return null;

  const row = profileRes.data as ProfileRow;
  const profile = mapProfile(row);
  const memberDocuments = ((documentsRes.data ?? []) as DocumentRow[]).map((document) => ({
    id: document.id,
    profileId: document.profile_id,
    documentType: document.document_type,
    documentGroup: document.document_group ?? "legacy",
    documentPart: document.document_part ?? "legacy",
    fileName: document.file_name,
    filePath: document.file_path,
    mimeType: document.mime_type ?? "application/octet-stream",
    uploadedAt: document.uploaded_at,
    documentNumber: document.document_number ?? null,
  }));
  const linkedRes = await client
    .from("profiles")
    .select("id")
    .eq("current_mobile", row.current_mobile ?? "");
  if (linkedRes.error) throw linkedRes.error;
  const linkedMemberCount = (linkedRes.data ?? []).length;
  const resolvedPhotoUrl = await getMemberProfilePhotoUrl(row.id, row.photo_url ?? undefined);

  const member = {
    ...profile,
    photoUrl: resolvedPhotoUrl ?? undefined,
    linkedMemberCount,
    verification: computeVerification(profile, memberDocuments),
  } satisfies MemberWithVerification;
  return applyAdminReviewToVerification(member, (reviewRes.data as MemberAdminReviewRow | null) ?? null);
}

export async function getMemberByIdBasic(id: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function getMembersByIdsBasic(profileIds: string[]) {
  if (!profileIds.length) return [];
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("profiles").select("*").in("id", profileIds);
  if (error) throw error;
  const rows = (data ?? []) as ProfileRow[];
  const order = new Map(profileIds.map((id, index) => [id, index]));
  return rows.map(mapProfile).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export async function findMemberByMobile(mobile: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("current_mobile", normalizeMobile(mobile))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function findMemberByEmail(email: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .ilike("email", email.trim())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function getProfilesByMobileForAuth(mobile: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return [];
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("current_mobile", normalized)
    .order("membership_id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(mapProfile);
}

export async function getMemberByEmailForAuth(email: string) {
  return findMemberByEmail(email);
}

export async function getMemberByIdForAuth(profileId: string) {
  return getMemberByIdBasic(profileId);
}

export async function findVerifiedMobileOwnerFast(mobile: string, excludeProfileId?: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const client = getRequiredSupabaseClient();
  let query = client
    .from("profiles")
    .select("*")
    .eq("current_mobile", normalized)
    .eq("mobile_verified", true)
    .limit(1);
  if (excludeProfileId) {
    query = query.neq("id", excludeProfileId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function findVerifiedEmailOwnerFast(email: string, excludeProfileId?: string) {
  const normalized = email.trim();
  if (!normalized) return null;
  const client = getRequiredSupabaseClient();
  let query = client
    .from("profiles")
    .select("*")
    .ilike("email", normalized)
    .eq("email_verified", true)
    .limit(1);
  if (excludeProfileId) {
    query = query.neq("id", excludeProfileId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function findVerifiedMobileOwner(mobile: string, excludeProfileId?: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const members = await listMembersWithVerification();
  return members.find((member) => member.id !== excludeProfileId && normalizeMobile(member.currentMobile) === normalized && member.verification.mobileVerified) ?? null;
}

export async function findVerifiedEmailOwner(email: string, excludeProfileId?: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const members = await listMembersWithVerification();
  return members.find((member) => member.id !== excludeProfileId && member.email.trim().toLowerCase() === normalized && member.verification.emailVerified) ?? null;
}

export async function getLinkedMembers(profileId: string) {
  const member = await getMemberById(profileId);
  if (!member) return [];
  const normalizedMobile = normalizeMobile(member.currentMobile);
  if (!normalizedMobile) return [member];

  const client = getRequiredSupabaseClient();
  const profileRowsRes = await client.from("profiles").select("id").eq("current_mobile", normalizedMobile);
  if (profileRowsRes.error) throw profileRowsRes.error;
  const profileIds = (profileRowsRes.data ?? []).map((row) => row.id as string);
  return getMembersByIdsWithVerification(profileIds);
}

export async function updateMember(profileId: string, updates: Partial<MemberProfile>) {
  const client = getRequiredSupabaseClient();
  const { error } = await client.from("profiles").update(toProfileUpdates(updates)).eq("id", profileId);
  if (error) throw error;
  return getMemberById(profileId);
}

export async function seedImportTargetReady() {
  const client = getRequiredSupabaseClient();
  const { error } = await client.from("profiles").select("id").limit(1);
  return !error;
}

export function createSyntheticDocumentPath(profileId: string, documentType: string, fileName: string) {
  return `pending/${profileId}/${documentType}/${Math.random().toString(36).slice(2, 10)}-${fileName}`;
}

export async function createMobileChangeRequest(input: Omit<MobileChangeRequest, "id" | "createdAt">) {
  const client = getRequiredSupabaseClient();
  const payload = {
    profile_id: input.profileId,
    old_mobile: input.oldMobile,
    new_mobile: normalizeMobile(input.newMobile),
    status: input.status,
    requested_by_profile_id: input.requestedByProfileId || null,
  };
  const { data, error } = await client.from("mobile_change_requests").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("Unable to create mobile change request.");
  return { ...mapMobileChange(data as MobileChangeRow), purpose: input.purpose };
}

export async function getMobileChangeRequest(id: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("mobile_change_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapMobileChange(data as MobileChangeRow);
}

export async function completeMobileChangeRequest(id: string) {
  const client = getRequiredSupabaseClient();
  const request = await getMobileChangeRequest(id);
  if (!request) return null;
  const verifiedAt = new Date().toISOString();
  const [{ error: requestError }, { error: profileError }] = await Promise.all([
    client.from("mobile_change_requests").update({ status: "verified", verified_at: verifiedAt }).eq("id", id),
    client.from("profiles").update({ current_mobile: normalizeMobile(request.newMobile), mobile_verified: true, status: "Active", updated_at: verifiedAt }).eq("id", request.profileId),
  ]);
  if (requestError) throw requestError;
  if (profileError) throw profileError;
  return { ...request, status: "verified", verifiedAt };
}
