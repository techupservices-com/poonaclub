import type { MemberWithVerification } from "@/lib/types";
import { normalizeMobile } from "@/lib/utils";
import { addAuditLog } from "@/lib/services/audit-service";
import { getRequiredSupabaseClient, type MobileLoginOwnerRow } from "@/lib/services/shared-db";
import { getMemberById, listMembersWithVerification } from "@/lib/services/member-service";

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
  const { data, error } = await client.from("mobile_login_owners").select("*").eq("mobile", normalized).maybeSingle();
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
    { mobile: normalized, profile_id: profileId, updated_at: new Date().toISOString() },
    { onConflict: "mobile" },
  );
  if (error) throw error;
  await addAuditLog({ actorType: "member", actorId: profileId, action: "Assigned mobile login owner", targetProfileId: profileId, metadata: { mobile: normalized } });
}

export async function ensureMobileLoginOwner(mobile: string) {
  const normalized = normalizeMobile(mobile);
  if (!normalized) return null;
  const existing = await getMobileLoginOwner(normalized);
  if (existing?.profileId) {
    const owner = await getMemberById(existing.profileId);
    if (owner && normalizeMobile(owner.currentMobile) === normalized) return owner;
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
