import {
  addAuditLog as addMockAuditLog,
  addDocument as addMockDocument,
  completeMobileChangeRequest as completeMockMobileChangeRequest,
  createMobileChangeRequest as createMockMobileChangeRequest,
  findMemberByIdentifier as findMockMemberByIdentifier,
  getMobileChangeRequest as getMockMobileChangeRequest,
  listAuditLogs as listMockAuditLogs,
  listDocuments as listMockDocuments,
  listMembersWithVerification as listMockMembersWithVerification,
  updateMember as updateMockMember,
} from "@/lib/mock-store";
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
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_at: string;
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

let supabaseAvailability: boolean | null = null;

function mapProfile(row: ProfileRow): MemberProfile {
  return {
    id: row.id,
    membershipId: row.membership_id,
    prefix: row.prefix ?? "",
    fullName: row.full_name,
    memberType: row.member_type ?? "",
    status: row.status ?? "",
    email: row.email ?? "",
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
    fileName: row.file_name,
    filePath: row.file_path,
    mimeType: row.mime_type ?? "application/octet-stream",
    uploadedAt: row.uploaded_at,
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

async function hasSupabaseData() {
  if (supabaseAvailability !== null) return supabaseAvailability;
  const client = createServerSupabaseClient();
  if (!client) {
    supabaseAvailability = false;
    return false;
  }

  const { error } = await client.from("profiles").select("id").limit(1);
  supabaseAvailability = !error;
  return supabaseAvailability;
}

async function getProfilesAndDocuments() {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return null;

  const [{ data: profiles, error: profilesError }, { data: documents, error: documentsError }] = await Promise.all([
    client.from("profiles").select("*").order("full_name"),
    client.from("member_documents").select("*"),
  ]);

  if (profilesError || documentsError || !profiles || !documents) {
    return null;
  }

  return {
    profiles: profiles as ProfileRow[],
    documents: documents as DocumentRow[],
  };
}

function buildMembersWithVerification(profiles: ProfileRow[], documents: DocumentRow[]) {
  return profiles.map((row) => {
    const profile = mapProfile(row);
    const memberDocuments = documents.filter((document) => document.profile_id === row.id).map(mapDocument);
    const linkedMemberCount = profiles.filter(
      (candidate) => normalizeMobile(candidate.current_mobile ?? "") === normalizeMobile(row.current_mobile ?? ""),
    ).length;

    return {
      ...profile,
      linkedMemberCount,
      verification: computeVerification(profile, memberDocuments),
    } satisfies MemberWithVerification;
  });
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

export async function listMembersWithVerification() {
  const result = await getProfilesAndDocuments();
  if (!result) return listMockMembersWithVerification();
  return buildMembersWithVerification(result.profiles, result.documents);
}

export async function getMemberById(id: string) {
  const members = await listMembersWithVerification();
  return members.find((member) => member.id === id) ?? null;
}

export async function findMemberByIdentifier(identifier: string) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return findMockMemberByIdentifier(identifier);

  const normalized = normalizeMobile(identifier);
  const value = identifier.trim();
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .or(`membership_id.eq.${value},current_mobile.eq.${normalized}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return findMockMemberByIdentifier(identifier);
  return mapProfile(data as ProfileRow);
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
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return updateMockMember(profileId, updates);

  const { error } = await client.from("profiles").update(toProfileUpdates(updates)).eq("id", profileId);
  if (error) return updateMockMember(profileId, updates);
  return getMemberById(profileId);
}

export async function addDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) {
    return addMockDocument(profileId, documentType, fileName, mimeType);
  }

  await client.from("member_documents").delete().eq("profile_id", profileId).eq("document_type", documentType);
  const payload = {
    profile_id: profileId,
    document_type: documentType,
    file_name: fileName,
    file_path: `pending/${profileId}/${documentType}/${fileName}`,
    mime_type: mimeType,
  };
  const { data, error } = await client.from("member_documents").insert(payload).select("*").single();
  if (error || !data) return addMockDocument(profileId, documentType, fileName, mimeType);
  return mapDocument(data as DocumentRow);
}

export async function uploadMemberDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
  bytes: ArrayBuffer,
) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) {
    return addMockDocument(profileId, documentType, fileName, mimeType);
  }

  const bucket = documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const filePath = `${profileId}/${documentType}/${generateId("upload")}-${fileName.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, Buffer.from(bytes), {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return addMockDocument(profileId, documentType, fileName, mimeType);
  }

  await client.from("member_documents").delete().eq("profile_id", profileId).eq("document_type", documentType);
  const { data, error } = await client
    .from("member_documents")
    .insert({
      profile_id: profileId,
      document_type: documentType,
      file_name: fileName,
      file_path: filePath,
      mime_type: mimeType,
    })
    .select("*")
    .single();

  if (error || !data) {
    return addMockDocument(profileId, documentType, fileName, mimeType);
  }

  return mapDocument(data as DocumentRow);
}

export async function listDocuments(profileId: string) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return listMockDocuments(profileId);

  const { data, error } = await client
    .from("member_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("uploaded_at", { ascending: false });
  if (error || !data) return listMockDocuments(profileId);
  return (data as DocumentRow[]).map(mapDocument);
}

export async function createMobileChangeRequest(input: Omit<MobileChangeRequest, "id" | "createdAt">) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return createMockMobileChangeRequest(input);

  const payload = {
    profile_id: input.profileId,
    old_mobile: input.oldMobile,
    new_mobile: normalizeMobile(input.newMobile),
    status: input.status,
    requested_by_profile_id: input.requestedByProfileId || null,
  };
  const { data, error } = await client.from("mobile_change_requests").insert(payload).select("*").single();
  if (error || !data) return createMockMobileChangeRequest(input);
  return {
    ...mapMobileChange(data as MobileChangeRow),
    purpose: input.purpose,
  };
}

export async function getMobileChangeRequest(id: string) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return getMockMobileChangeRequest(id);

  const { data, error } = await client.from("mobile_change_requests").select("*").eq("id", id).maybeSingle();
  if (error || !data) return getMockMobileChangeRequest(id);
  return mapMobileChange(data as MobileChangeRow);
}

export async function completeMobileChangeRequest(id: string) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return completeMockMobileChangeRequest(id);

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

  if (requestError || profileError) return completeMockMobileChangeRequest(id);
  return { ...request, status: "verified", verifiedAt };
}

export async function listAuditLogs() {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) return listMockAuditLogs();

  const { data, error } = await client.from("audit_logs").select("*").order("created_at", { ascending: false });
  if (error || !data) return listMockAuditLogs();
  return (data as AuditRow[]).map(mapAudit);
}

export async function addAuditLog(log: Omit<AuditLog, "id" | "createdAt">) {
  const client = createServerSupabaseClient();
  if (!client || !(await hasSupabaseData())) {
    addMockAuditLog(log);
    return;
  }

  const payload = {
    actor_type: log.actorType,
    actor_profile_id: isUuid(log.actorId) ? log.actorId : null,
    action: log.action,
    target_profile_id: log.targetProfileId,
    metadata: log.metadata,
  };

  const { error } = await client.from("audit_logs").insert(payload);
  if (error) addMockAuditLog(log);
}

export async function seedImportTargetReady() {
  return hasSupabaseData();
}

export function createSyntheticDocumentPath(profileId: string, documentType: string, fileName: string) {
  return `pending/${profileId}/${documentType}/${generateId("upload")}-${fileName}`;
}
