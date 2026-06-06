import { OTP_EXPIRY_MINUTES, OTP_LENGTH } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashValue } from "@/lib/utils";
import type { IdentifierType, OtpDeliveryChannel, OtpRecord, VerificationPurpose } from "@/lib/types";

function getRequiredSupabaseClient() {
  const client = createServerSupabaseClient();
  if (!client) {
    throw new Error("Supabase environment variables are missing.");
  }
  return client;
}

function mapOtpRecord(record: {
  id: string;
  profile_id: string;
  mobile: string;
  purpose: VerificationPurpose;
  otp_hash: string;
  expires_at: string;
  created_at: string;
  attempt_count: number;
  max_attempts: number;
  verify_status: "pending" | "verified" | "expired";
  request_id: string | null;
}) {
  return {
    id: record.id,
    profileId: record.profile_id,
    mobile: record.mobile,
    purpose: record.purpose,
    otpHash: record.otp_hash,
    expiresAt: record.expires_at,
    createdAt: record.created_at,
    attemptCount: record.attempt_count,
    maxAttempts: record.max_attempts,
    status: record.verify_status,
    referenceId: record.request_id ?? undefined,
  } satisfies OtpRecord;
}

export async function createOtp(
  profileId: string,
  destination: string,
  purpose: VerificationPurpose,
  identifierType: IdentifierType,
  deliveryChannel: OtpDeliveryChannel,
  referenceId?: string,
) {
  const client = getRequiredSupabaseClient();
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  const code = `${Math.floor(min + Math.random() * (max - min))}`;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await client
    .from("otp_requests")
    .update({ verify_status: "expired" })
    .eq("profile_id", profileId)
    .eq("purpose", purpose)
    .eq("verify_status", "pending");

  const payload = {
    profile_id: profileId,
    mobile: destination,
    purpose,
    otp_hash: hashValue(code),
    expires_at: expiresAt.toISOString(),
    attempt_count: 0,
    max_attempts: 5,
    verify_status: "pending",
    request_id: referenceId ?? null,
    client_reference: referenceId ?? null,
  };
  const { data, error } = await client.from("otp_requests").insert(payload).select("*").single();
  if (error || !data) {
    throw error ?? new Error("Unable to create OTP record.");
  }

  return { record: mapOtpRecord(data), code };
}

export async function verifyOtp(
  profileId: string,
  purpose: VerificationPurpose,
  code: string,
  referenceId?: string,
) {
  const client = getRequiredSupabaseClient();
  let query = client
    .from("otp_requests")
    .select("*")
    .eq("profile_id", profileId)
    .eq("purpose", purpose)
    .eq("verify_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (referenceId) {
    query = query.eq("request_id", referenceId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: false, reason: "No pending OTP found." };
  }

  const record = mapOtpRecord(data);

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await client.from("otp_requests").update({ verify_status: "expired" }).eq("id", record.id);
    return { ok: false, reason: "OTP has expired." };
  }

  const attemptCount = record.attemptCount + 1;
  if (attemptCount > record.maxAttempts) {
    await client
      .from("otp_requests")
      .update({ attempt_count: attemptCount, verify_status: "expired" })
      .eq("id", record.id);
    return { ok: false, reason: "Too many attempts." };
  }

  if (record.otpHash !== hashValue(code)) {
    await client.from("otp_requests").update({ attempt_count: attemptCount }).eq("id", record.id);
    return { ok: false, reason: "Incorrect OTP." };
  }

  const verifiedAt = new Date().toISOString();
  await client
    .from("otp_requests")
    .update({ attempt_count: attemptCount, verify_status: "verified", verified_at: verifiedAt })
    .eq("id", record.id);
  return { ok: true, record: { ...record, attemptCount, status: "verified" } };
}
