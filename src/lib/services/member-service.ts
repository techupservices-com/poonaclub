import type { MemberProfile, MemberWithVerification, MobileChangeRequest } from "@/lib/types";
import { normalizeMobile } from "@/lib/utils";
import { computeVerification } from "@/lib/verification";
import {
  fetchAllRows,
  getRequiredSupabaseClient,
  mapMobileChange,
  mapProfile,
  type DocumentRow,
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

export async function getMemberById(id: string) {
  const members = await listMembersWithVerification();
  return members.find((member) => member.id === id) ?? null;
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
  const members = await listMembersWithVerification();
  return members.filter((entry) => normalizeMobile(entry.currentMobile) === normalizeMobile(member.currentMobile));
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
