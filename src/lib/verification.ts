import type { MemberDocument, MemberProfile, VerificationChecklist } from "@/lib/types";

export function computeVerification(
  profile: MemberProfile,
  documents: MemberDocument[],
): VerificationChecklist {
  const selfieUploaded = documents.some((document) => document.documentGroup === "selfie");
  const aadharFront = documents.some((document) => document.documentGroup === "aadhar" && document.documentPart === "front");
  const aadharBack = documents.some((document) => document.documentGroup === "aadhar" && document.documentPart === "back");
  const passportFirst = documents.some((document) => document.documentGroup === "passport" && document.documentPart === "first_page");
  const passportLast = documents.some((document) => document.documentGroup === "passport" && document.documentPart === "last_page");
  const documentUploaded = (aadharFront && aadharBack) || (passportFirst && passportLast);
  const profileConfirmed = Boolean(
    profile.membershipId &&
      profile.fullName &&
      profile.email &&
      profile.currentMobile,
  );
  const completed =
    profileConfirmed && profile.mobileVerified && profile.emailVerified && selfieUploaded && documentUploaded;

  return {
    profileConfirmed,
    mobileVerified: profile.mobileVerified,
    emailVerified: profile.emailVerified,
    selfieUploaded,
    documentUploaded,
    completed,
  };
}
