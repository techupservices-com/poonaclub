import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminReviewStatus, AuditLog, MemberDocument, MemberProfile, MobileChangeRequest } from "@/lib/types";

const DB_BATCH_SIZE = 1000;

export interface ProfileRow {
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

export interface DocumentRow {
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

export interface OtpRequestRow {
  target_profile_id: string;
  action: string;
}

export interface MobileChangeRow {
  id: string;
  profile_id: string;
  old_mobile: string | null;
  new_mobile: string;
  status: "pending" | "verified" | "cancelled";
  requested_by_profile_id: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface AuditRow {
  id: string;
  actor_type: "member" | "admin";
  actor_profile_id: string | null;
  action: string;
  target_profile_id: string;
  metadata: Record<string, string> | null;
  created_at: string;
}

export interface MobileLoginOwnerRow {
  id: string;
  mobile: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
}

export interface MemberVerificationSummaryRow {
  profile_id: string;
  membership_id: string;
  full_name: string;
  current_mobile: string | null;
  email: string | null;
  mobile_verified: boolean;
  email_verified: boolean;
  selfie_uploaded: boolean;
  profile_complete: boolean;
  shared_mobile_count: number;
  owner_profile_id: string | null;
  is_mobile_login_owner: boolean;
  shared_mobile_pending: boolean;
  completed: boolean;
  admin_review_status?: AdminReviewStatus | null;
  admin_reviewed_at?: string | null;
  admin_rejection_steps?: string[] | null;
  admin_rejection_message?: string | null;
}

export interface MemberVerificationSnapshotRow {
  profile_id: string;
  membership_id: string | null;
  full_name: string | null;
  member_type: string | null;
  status: string | null;
  current_mobile: string | null;
  email: string | null;
  mobile_verified: boolean;
  email_verified: boolean;
  selfie_uploaded: boolean;
  profile_complete: boolean;
  shared_mobile_count: number;
  owner_profile_id: string | null;
  is_mobile_login_owner: boolean;
  shared_mobile_pending: boolean;
  completed: boolean;
  admin_review_status?: AdminReviewStatus | null;
  admin_reviewed_at?: string | null;
  admin_rejection_steps?: string[] | null;
  admin_rejection_message?: string | null;
  photo_public_url: string | null;
  updated_at: string;
}

export interface MemberAdminReviewRow {
  profile_id: string;
  status: AdminReviewStatus;
  approved_by: string | null;
  approved_at: string | null;
  disapproved_by: string | null;
  disapproved_at: string | null;
  disapproved_steps: string[] | null;
  disapproval_message: string | null;
  updated_at: string;
}

export interface BroadcastEmailRow {
  id: string;
  created_by: string;
  selection_mode: "selected_visible" | "all_filtered";
  query_text: string;
  filter_flags: string[] | null;
  template_key: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: "queued" | "processing" | "completed" | "completed_with_errors" | "failed" | "cancelled";
  total_resolved: number;
  total_valid: number;
  total_skipped: number;
  total_batches: number;
  batches_completed: number;
  sent_to_provider_count: number;
  delivered_count: number;
  bounced_count: number;
  complained_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BroadcastEmailBatchRow {
  id: string;
  broadcast_email_id: string;
  sequence_no: number;
  status: "pending" | "claimed" | "sending" | "retryable" | "completed" | "failed";
  recipient_count: number;
  processed_count: number;
  success_count: number;
  failure_count: number;
  attempt_count: number;
  claimed_at: string | null;
  claim_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  idempotency_key: string;
  last_error: string | null;
}

export interface BroadcastEmailRecipientRow {
  id: string;
  broadcast_email_id: string;
  batch_id: string | null;
  profile_id: string | null;
  email: string;
  full_name: string;
  status: "pending" | "sent_to_provider" | "delivered" | "bounced" | "complained" | "failed" | "skipped";
  skip_reason: string | null;
  provider_message_id: string | null;
  provider_last_event: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function getRequiredSupabaseClient() {
  const client = createServerSupabaseClient();
  if (!client) {
    throw new Error("Supabase environment variables are missing.");
  }
  return client;
}

export function mapProfile(row: ProfileRow): MemberProfile {
  return {
    id: row.id,
    membershipId: row.membership_id,
    prefix: row.prefix ?? "",
    fullName: row.full_name,
    memberType: row.member_type ?? "",
    status: row.status ?? "",
    email: row.email ?? "",
    emailVerified: Boolean(row.email_verified),
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

export function mapDocument(row: DocumentRow): MemberDocument {
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

export function mapMobileChange(row: MobileChangeRow): MobileChangeRequest {
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

export function mapAudit(row: AuditRow): AuditLog {
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

export async function fetchAllRows<T>(table: string, select: string, orderColumn?: string) {
  const client = getRequiredSupabaseClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = client.from(table).select(select).range(from, from + DB_BATCH_SIZE - 1);
    if (orderColumn) query = query.order(orderColumn);
    const { data, error } = await query;
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < DB_BATCH_SIZE) break;
    from += DB_BATCH_SIZE;
  }

  return rows;
}
