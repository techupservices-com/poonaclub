export type Role = "member" | "admin";

export type VerificationPurpose =
  | "login"
  | "mobile_change"
  | "linked_member_mobile_change"
  | "email_verify";

export type IdentifierType = "mobile" | "email";
export type OtpDeliveryChannel = "sms" | "whatsapp" | "email";

export type VerificationState = "pending" | "verified" | "attention";

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
}

export interface MemberWithVerification extends MemberProfile {
  verification: VerificationChecklist;
  linkedMemberCount: number;
}
