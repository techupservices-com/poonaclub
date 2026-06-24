export type Role = "member" | "admin";

export type VerificationPurpose =
  | "login"
  | "mobile_change"
  | "linked_member_mobile_change"
  | "email_verify";

export type IdentifierType = "mobile" | "email";
export type OtpDeliveryChannel = "mobile" | "sms" | "whatsapp" | "email";

export type VerificationState = "pending" | "verified" | "attention";
export type AdminReviewStatus = "pending" | "approved" | "disapproved";
export type AdminReviewStep = "selfie" | "mobile" | "email";
export type MemberDirectoryFilterKey = "verified" | "approved" | "disapproved" | "shared" | "inprogress" | "notstarted";
export type BroadcastEmailSelectionMode = "selected_visible" | "all_filtered";
export type BroadcastEmailStatus = "queued" | "processing" | "completed" | "completed_with_errors" | "failed" | "cancelled";
export type BroadcastEmailBatchStatus = "pending" | "claimed" | "sending" | "retryable" | "completed" | "failed";
export type BroadcastEmailRecipientStatus = "pending" | "sent_to_provider" | "delivered" | "bounced" | "complained" | "failed" | "skipped";

export interface MemberProfile {
  id: string;
  membershipId: string;
  prefix: string;
  fullName: string;
  memberType: string;
  status: string;
  email: string;
  emailVerified: boolean;
  currentMobile: string;
  mobileVerified: boolean;
  dateOfBirth: string;
  joinedAt: string;
  city: string;
  pincode: string;
  address1: string;
  address2: string;
  address3: string;
  photoUrl?: string;
  role: Role;
}

export interface MemberDocument {
  id: string;
  profileId: string;
  documentType: "selfie" | "document";
  documentGroup: "selfie" | "aadhar" | "passport" | "legacy";
  documentPart: "selfie" | "front" | "back" | "first_page" | "last_page" | "legacy";
  documentNumber?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  uploadedAt: string;
}

export interface MobileChangeRequest {
  id: string;
  profileId: string;
  oldMobile: string;
  newMobile: string;
  status: "pending" | "verified" | "cancelled";
  requestedByProfileId: string;
  purpose: VerificationPurpose;
  createdAt: string;
  verifiedAt?: string;
}

export interface OtpRecord {
  id: string;
  profileId: string;
  mobile: string;
  purpose: VerificationPurpose;
  identifierType?: IdentifierType;
  deliveryChannel?: OtpDeliveryChannel;
  otpHash: string;
  expiresAt: string;
  createdAt: string;
  attemptCount: number;
  maxAttempts: number;
  status: "pending" | "verified" | "expired";
  referenceId?: string;
}

export interface AuditLog {
  id: string;
  actorType: Role;
  actorId: string;
  action: string;
  targetProfileId: string;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface VerificationChecklist {
  profileConfirmed: boolean;
  mobileVerified: boolean;
  emailVerified: boolean;
  selfieUploaded: boolean;
  documentUploaded: boolean;
  completed: boolean;
  adminReviewStatus?: AdminReviewStatus;
  adminReviewedAt?: string | null;
  adminRejectionSteps?: AdminReviewStep[];
  adminRejectionMessage?: string | null;
}

export interface MemberWithVerification extends MemberProfile {
  verification: VerificationChecklist;
  linkedMemberCount: number;
}

export interface BroadcastEmailRecipientSample {
  profileId: string;
  email: string;
  fullName: string;
}

export interface BroadcastEmailPreview {
  totalResolved: number;
  totalValid: number;
  totalSkipped: number;
  samples: BroadcastEmailRecipientSample[];
}

export interface BroadcastEmailRecipient {
  id: string;
  broadcastEmailId: string;
  batchId?: string;
  profileId?: string;
  email: string;
  fullName: string;
  status: BroadcastEmailRecipientStatus;
  skipReason?: string | null;
  providerMessageId?: string | null;
  providerLastEvent?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BroadcastEmailBatch {
  id: string;
  broadcastEmailId: string;
  sequenceNo: number;
  status: BroadcastEmailBatchStatus;
  recipientCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  attemptCount: number;
  claimedAt?: string | null;
  claimExpiresAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  idempotencyKey: string;
  lastError?: string | null;
}

export interface BroadcastEmailCampaign {
  id: string;
  createdBy: string;
  selectionMode: BroadcastEmailSelectionMode;
  queryText: string;
  filterFlags: MemberDirectoryFilterKey[];
  templateKey: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  status: BroadcastEmailStatus;
  totalResolved: number;
  totalValid: number;
  totalSkipped: number;
  totalBatches: number;
  batchesCompleted: number;
  sentToProviderCount: number;
  deliveredCount: number;
  bouncedCount: number;
  complainedCount: number;
  failedCount: number;
  lastError?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface BroadcastEmailCampaignDetail extends BroadcastEmailCampaign {
  batches: BroadcastEmailBatch[];
}

export type AdminSelectionMode = "selected_ids" | "all_filtered";
