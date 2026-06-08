import { DOCUMENT_BUCKET, SELFIE_BUCKET } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuditLog, MemberDocument, MemberProfile, MemberWithVerification, MobileChangeRequest } from "@/lib/types";
import { generateId, normalizeMobile } from "@/lib/utils";
import { computeVerification } from "@/lib/verification";

interface ProfileRow {
  id: string;
  membership_id: string;
  prefix: string | null;
  full_name: string;
  member_type: string | null;
  status: string | null;
  email: string | null;
  email_verified: boolean | null;
  current_mobile: string | null;
  mobile_verified: boolean | null;
  date_of_birth: string | null;
  joined_at: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  pincode: string | null;
  photo_url: string | null;
  role: "member" | "admin" | null;
}

interface DocumentRow {
  id: string;
  profile_id: string;
  document_type: "selfie" | "document";
  document_group: "selfie" | "aadhar" | "passport" | "legacy" | null;
  document_part: "selfie" | "front" | "back" | "first_page" | "last_page" | "legacy" | null;
  document_number: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_at: string;
}

interface OtpRequestRow {
  target_profile_id: string;
  action: string;
}

interface MobileChangeRow {
  id: string;
  profile_id: string;
  old_mobile: string | null;
  new_mobile: string;
  status: "pending" | "verified" | "cancelled";
  requested_by_profile_id: string | null;
  created_at: string;
  verified_at: string | null;
}

interface AuditRow {
  id: string;
  actor_type: "member" | "admin";
  actor_profile_id: string | null;
  action: string;
  target_profile_id: string;
  metadata: Record<string, string> | null;
  created_at: string;
}

interface MobileLoginOwnerRow {
  id: string;
  mobile: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
}

function getRequiredSupabaseClient() {
  const client = createServerSupabaseClient();
  if (!client) {
    throw new Error("Supabase environment variables are missing.");
  }
  return client;
}

function mapProfile(row: ProfileRow): MemberProfile {
  return {
    id: row.id,
    membershipId: row.membership_id,
    prefix: row.prefix ?? "",
    fullName: row.full_name,
    memberType: row.member_type ?? "",
    status: row.status ?? "",
    email: row.email ?? "",
    emailVerified: false,
    currentMobile: row.current_mobile ?? "",
    mobileVerified: Boolean(row.mobile_verified),
    dateOfBirth: row.date_of_birth ?? "1970-01-01",
    joinedAt: row.joined_at ?? "1970-01-01",
    city: row.city ?? "",
    pincode: row.pincode ?? "",
    address1: row.address1 ?? "",
    address2: row.address2 ?? "",
    address3: row.address3 ?? "",
    photoUrl: row.photo_url ?? undefined,
    role: row.role ?? "member",
  };
}

function mapDocument(row: DocumentRow): MemberDocument {
  return {
    id: row.id,
    profileId: row.profile_id,
    documentType: row.document_type,
    documentGroup: (row.document_group ?? "legacy") as MemberDocument["documentGroup"],
    documentPart: (row.document_part ?? "legacy") as MemberDocument["documentPart"],
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type ?? "application/octet-stream",
    uploadedAt: row.uploaded_at,
    documentNumber: row.document_number ?? null,
  };
}

function mapMobileChange(row: MobileChangeRow): MobileChangeRequest {
  return {
    id: row.id,
    profileId: row.profile_id,
    oldMobile: row.old_mobile ?? "",
    newMobile: row.new_mobile,
    status: row.status,
    requestedByProfileId: row.requested_by_profile_id ?? "",
    purpose: "mobile_change",
    createdAt: row.created_at,
    verifiedAt: row.verified_at ?? undefined,
  };
}

function mapAudit(row: AuditRow): AuditLog {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_profile_id ?? "admin_root",
    action: row.action,
    targetProfileId: row.target_profile_id,
    createdAt: row.created_at,
    metadata: row.metadata ?? {},
  };
}

async function resolveMemberPhotoUrl(
  client: ReturnType<typeof getRequiredSupabaseClient>,
  profileId: string,
  photoUrl: string | null,
  documents: DocumentRow[],
) {
  if (photoUrl?.startsWith("http://") || photoUrl?.startsWith("https://")) {
    return photoUrl;
  }

  const selfie = documents.find(
    (document) => document.profile_id === profileId && document.document_type === "selfie",
  );
  const storagePath = photoUrl || selfie?.file_path;

  if (!storagePath) return undefined;

  const { data, error } = await client.storage
    .from(SELFIE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}

async function createSignedStorageUrl(bucket: string, filePath: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(filePath, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function getProfilesAndDocuments() {
  const client = getRequiredSupabaseClient();

  const [
    { data: profiles, error: profilesError },
    { data: documents, error: documentsError },
    { data: otpRequests, error: otpRequestsError },
  ] = await Promise.all([
    client.from("profiles").select("*").order("full_name"),
    client.from("member_documents").select("*"),
    client.from("audit_logs").select("target_profile_id,action"),
  ]);

  if (profilesError) {
    throw profilesError;
  }

  if (documentsError) {
    throw documentsError;
  }

  if (otpRequestsError) {
    throw otpRequestsError;
  }

  return {
    profiles: (profiles ?? []) as ProfileRow[],
    documents: (documents ?? []) as DocumentRow[],
    otpRequests: (otpRequests ?? []) as OtpRequestRow[],
  };
}

async function buildMembersWithVerification(
  profiles: ProfileRow[],
  documents: DocumentRow[],
  otpRequests: OtpRequestRow[],
) {
  const client = getRequiredSupabaseClient();

  return Promise.all(profiles.map(async (row) => {
    const emailVerified = otpRequests.some(
      (entry) =>
        entry.target_profile_id === row.id &&
        (entry.action === "Verified email via OTP" || entry.action.includes("Verified login email via email OTP")),
    );
    const profile = { ...mapProfile(row), emailVerified };
    const memberDocuments = documents.filter((document) => document.profile_id === row.id).map(mapDocument);
    const linkedMemberCount = profiles.filter(
      (candidate) => normalizeMobile(candidate.current_mobile ?? "") === normalizeMobile(row.current_mobile ?? ""),
    ).length;
    const resolvedPhotoUrl = await resolveMemberPhotoUrl(client, row.id, row.photo_url, documents);

    return {
      ...profile,
      photoUrl: resolvedPhotoUrl,
      linkedMemberCount,
      verification: computeVerification(profile, memberDocuments),
    } satisfies MemberWithVerification;
  }));
}

function toProfileUpdates(updates: Partial<MemberProfile>) {
  return {
    ...(updates.email !== undefined ? { email: updates.email } : {}),
    ...(updates.currentMobile !== undefined
      ? { current_mobile: normalizeMobile(updates.currentMobile) }
      : {}),
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getVerificationScore(member: MemberWithVerification) {
  let score = 0;
  if (member.verification.completed) score += 100;
  if (member.verification.mobileVerified) score += 30;
  if (member.verification.emailVerified) score += 20;
  if (member.verification.profileConfirmed) score += 20;
  if (member.verification.selfieUploaded) score += 15;
  if (member.verification.documentUploaded) score += 15;
  return score;
}

export async function listProfilesByMobile(mobile: string) {
  const normalized = normalizeMobile(mobile);
  const members = await listMembersWithVerification();
  return members.filter((member) => normalizeMobile(member.currentMobile) === normalized);
}

export function chooseBestMobileOwner(profiles: MemberWithVerification[]) {
  return [...profiles].sort((left, right) => {
    const scoreDiff = getVerificationScore(right) - getVerificationScore(left);
    if (scoreDiff !== 0) return scoreDiff;
    return left.membershipId.localeCompare(right.membershipId);
  })[0] ?? null;
}

export async function getMobileLoginOwner(mobile: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;

  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("mobile_login_owners")
    .select("*")
    .eq("mobile", normalized)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as MobileLoginOwnerRow;
  return { mobile: row.mobile, profileId: row.profile_id };
}

export async function setMobileLoginOwner(mobile: string, profileId: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return;

  const client = getRequiredSupabaseClient();
  const { error } = await client.from("mobile_login_owners").upsert(
    {
      mobile: normalized,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "mobile" },
  );
  if (error) throw error;

  await addAuditLog({
    actorType: "member",
    actorId: profileId,
    action: "Assigned mobile login owner",
    targetProfileId: profileId,
    metadata: { mobile: normalized },
  });
}

export async function ensureMobileLoginOwner(mobile: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;

  const existing = await getMobileLoginOwner(normalized);
  if (existing?.profileId) {
    const owner = await getMemberById(existing.profileId);
    if (owner && normalizeMobile(owner.currentMobile) === normalized) {
      return owner;
    }
  }

  const candidates = await listProfilesByMobile(normalized);
  if (!candidates.length) return null;

  const owner = chooseBestMobileOwner(candidates);
  if (!owner) return null;
  await setMobileLoginOwner(normalized, owner.id);
  return owner;
}

export async function reassignMobileLoginOwnerIfNeeded(mobile: string) {
  const candidates = await listProfilesByMobile(mobile);
  if (!candidates.length) return null;

  const owner = chooseBestMobileOwner(candidates);
  if (!owner) return null;
  await setMobileLoginOwner(mobile, owner.id);
  return owner;
}

export async function isMobileLoginOwner(profileId: string, mobile: string) {
  const owner = await getMobileLoginOwner(mobile);
  return owner?.profileId === profileId;
}

export async function listMembersWithVerification() {
  const result = await getProfilesAndDocuments();
  return await buildMembersWithVerification(result.profiles, result.documents, result.otpRequests);
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

  if (error) {
    throw error;
  }

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

  if (error) {
    throw error;
  }

  if (!data) return null;
  return mapProfile(data as ProfileRow);
}

export async function findVerifiedMobileOwner(mobile: string, excludeProfileId?: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const members = await listMembersWithVerification();
  return (
    members.find(
      (member) =>
        member.id !== excludeProfileId &&
        normalizeMobile(member.currentMobile) === normalized &&
        member.verification.mobileVerified,
    ) ?? null
  );
}

export async function findVerifiedEmailOwner(email: string, excludeProfileId?: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const members = await listMembersWithVerification();
  return (
    members.find(
      (member) =>
        member.id !== excludeProfileId &&
        member.email.trim().toLowerCase() === normalized &&
        member.verification.emailVerified,
    ) ?? null
  );
}

export async function getLinkedMembers(profileId: string) {
  const member = await getMemberById(profileId);
  if (!member) return [];
  const members = await listMembersWithVerification();
  return members.filter(
    (entry) => normalizeMobile(entry.currentMobile) === normalizeMobile(member.currentMobile),
  );
}

export async function updateMember(profileId: string, updates: Partial<MemberProfile>) {
  const client = getRequiredSupabaseClient();

  const { error } = await client.from("profiles").update(toProfileUpdates(updates)).eq("id", profileId);
  if (error) throw error;
  return getMemberById(profileId);
}

export async function addDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
) {
  const client = getRequiredSupabaseClient();

  await client.from("member_documents").delete().eq("profile_id", profileId).eq("document_type", documentType);
  const payload = {
    profile_id: profileId,
    document_type: documentType,
    file_name: fileName,
    file_path: `pending/${profileId}/${documentType}/${fileName}`,
    mime_type: mimeType,
  };
  const { data, error } = await client.from("member_documents").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("Unable to save document metadata.");
  return mapDocument(data as DocumentRow);
}

export async function uploadMemberDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
  bytes: ArrayBuffer,
  documentGroup?: "selfie" | "aadhar" | "passport" | "legacy",
  documentPart?: "selfie" | "front" | "back" | "first_page" | "last_page" | "legacy",
) {
  const client = getRequiredSupabaseClient();

  const bucket = documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const pathGroup = documentGroup ?? (documentType === "selfie" ? "selfie" : "legacy");
  const pathPart = documentPart ?? (documentType === "selfie" ? "selfie" : "legacy");
  const filePath = `${profileId}/${pathGroup}/${pathPart}/${generateId("upload")}-${fileName.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, Buffer.from(bytes), {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  if (documentType === "selfie") {
    await client.from("member_documents").delete().eq("profile_id", profileId).eq("document_type", documentType);
  } else if (documentGroup && documentPart) {
    const existingDocs = await listDocuments(profileId);
    const existing = existingDocs.find(
      (document) => document.documentGroup === documentGroup && document.documentPart === documentPart,
    );
    if (existing) {
      await client.from("member_documents").delete().eq("id", existing.id);
      await client.storage.from(bucket).remove([existing.filePath]);
    }
  }
  const { data, error } = await client
    .from("member_documents")
    .insert({
      profile_id: profileId,
      document_type: documentType,
      document_group: documentGroup ?? (documentType === "selfie" ? "selfie" : "legacy"),
      document_part: documentPart ?? (documentType === "selfie" ? "selfie" : "legacy"),
      document_number: null,
      file_name: fileName,
      file_path: filePath,
      mime_type: mimeType,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to save uploaded file metadata.");

  if (documentType === "selfie") {
    await client
      .from("profiles")
      .update({ photo_url: filePath, updated_at: new Date().toISOString() })
      .eq("id", profileId);
  }

  return mapDocument(data as DocumentRow);
}

export async function listDocuments(profileId: string) {
  const client = getRequiredSupabaseClient();

  const { data, error } = await client
    .from("member_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as DocumentRow[]).map(mapDocument);
}

export async function getMemberProfilePhotoUrl(profileId: string, photoUrl?: string) {
  const client = getRequiredSupabaseClient();
  const documents = await listDocuments(profileId);
  return (await resolveMemberPhotoUrl(
    client,
    profileId,
    photoUrl ?? null,
    documents.map((document) => ({
      id: document.id,
      profile_id: document.profileId,
      document_type: document.documentType,
      document_group: document.documentGroup,
      document_part: document.documentPart,
      document_number: document.documentNumber ?? null,
      file_path: document.filePath,
      file_name: document.fileName,
      mime_type: document.mimeType,
      uploaded_at: document.uploadedAt,
    })),
  )) ?? null;
}

export async function getMemberDocumentPreviewUrl(document: MemberDocument) {
  if (document.mimeType.startsWith("image/")) {
    const bucket = document.documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
    return createSignedStorageUrl(bucket, document.filePath);
  }

  return null;
}

export async function removeMemberDocument(profileId: string, documentType: "selfie" | "document") {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_documents")
    .select("id,file_path")
    .eq("profile_id", profileId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const bucket = documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const [{ error: storageError }, { error: deleteError }] = await Promise.all([
    client.storage.from(bucket).remove([data.file_path]),
    client.from("member_documents").delete().eq("id", data.id),
  ]);

  if (storageError) throw storageError;
  if (deleteError) throw deleteError;

  if (documentType === "selfie") {
    const { error: profileError } = await client
      .from("profiles")
      .update({ photo_url: null, updated_at: new Date().toISOString() })
      .eq("id", profileId);
    if (profileError) throw profileError;
  }

  return true;
}

export async function removeMemberDocumentById(profileId: string, documentId: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_documents")
    .select("id,file_path,document_type")
    .eq("profile_id", profileId)
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const bucket = data.document_type === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const [{ error: storageError }, { error: deleteError }] = await Promise.all([
    client.storage.from(bucket).remove([data.file_path]),
    client.from("member_documents").delete().eq("id", data.id),
  ]);

  if (storageError) throw storageError;
  if (deleteError) throw deleteError;

  if (data.document_type === "selfie") {
    const { error: profileError } = await client
      .from("profiles")
      .update({ photo_url: null, updated_at: new Date().toISOString() })
      .eq("id", profileId);
    if (profileError) throw profileError;
  }

  return true;
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
  return {
    ...mapMobileChange(data as MobileChangeRow),
    purpose: input.purpose,
  };
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
    client
      .from("mobile_change_requests")
      .update({ status: "verified", verified_at: verifiedAt })
      .eq("id", id),
    client
      .from("profiles")
      .update({
        current_mobile: normalizeMobile(request.newMobile),
        mobile_verified: true,
        status: "Active",
        updated_at: verifiedAt,
      })
      .eq("id", request.profileId),
  ]);

  if (requestError) throw requestError;
  if (profileError) throw profileError;
  return { ...request, status: "verified", verifiedAt };
}

export async function listAuditLogs() {
  const client = getRequiredSupabaseClient();

  const { data, error } = await client.from("audit_logs").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AuditRow[]).map(mapAudit);
}

export async function addAuditLog(log: Omit<AuditLog, "id" | "createdAt">) {
  const client = getRequiredSupabaseClient();

  const payload = {
    actor_type: log.actorType,
    actor_profile_id: isUuid(log.actorId) ? log.actorId : null,
    action: log.action,
    target_profile_id: log.targetProfileId,
    metadata: log.metadata,
  };

  const { error } = await client.from("audit_logs").insert(payload);
  if (error) throw error;
}

export async function seedImportTargetReady() {
  const client = getRequiredSupabaseClient();
  const { error } = await client.from("profiles").select("id").limit(1);
  return !error;
}

export function createSyntheticDocumentPath(profileId: string, documentType: string, fileName: string) {
  return `pending/${profileId}/${documentType}/${generateId("upload")}-${fileName}`;
}
