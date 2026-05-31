import { OTP_EXPIRY_MINUTES } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateId, hashValue } from "@/lib/utils";
import type { OtpRecord, VerificationPurpose } from "@/lib/types";

declare global {
  var __POONA_OTP_STATE__: OtpRecord[] | undefined;
}

function getStore() {
  if (!globalThis.__POONA_OTP_STATE__) {
    globalThis.__POONA_OTP_STATE__ = [];
  }
  return globalThis.__POONA_OTP_STATE__;
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
  mobile: string,
  purpose: VerificationPurpose,
  referenceId?: string,
) {
  const client = createServerSupabaseClient();
  const store = getStore();
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (client) {
    await client
      .from("otp_requests")
      .update({ verify_status: "expired" })
      .eq("profile_id", profileId)
      .eq("purpose", purpose)
      .eq("verify_status", "pending");

    const payload = {
      profile_id: profileId,
      mobile,
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

    if (!error && data) {
      return { record: mapOtpRecord(data), code };
    }
  }

  for (const entry of store) {
    if (entry.profileId === profileId && entry.purpose === purpose && entry.status === "pending") {
      entry.status = "expired";
    }
  }

  const record: OtpRecord = {
    id: generateId("otp"),
    profileId,
    mobile,
    purpose,
    otpHash: hashValue(code),
    expiresAt: expiresAt.toISOString(),
    createdAt: createdAt.toISOString(),
    attemptCount: 0,
    maxAttempts: 5,
    status: "pending",
    referenceId,
  };

  store.push(record);
  return { record, code };
}

export async function verifyOtp(
  profileId: string,
  purpose: VerificationPurpose,
  code: string,
  referenceId?: string,
) {
  const client = createServerSupabaseClient();
  if (client) {
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
    if (!error && data) {
      const record = mapOtpRecord(data);
      if (new Date(record.expiresAt).getTime() < Date.now()) {
        await client.from("otp_requests").update({ verify_status: "expired" }).eq("id", record.id);
        return { ok: false, reason: "OTP has expired." };
      }

      const attemptCount = record.attemptCount + 1;
      const expired = attemptCount > record.maxAttempts;
      if (expired) {
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
      return { ok: true, record: { ...record, attemptCount, status: "verified" as const } };
    }
  }

  const store = getStore();
  const record = [...store]
    .reverse()
    .find(
      (entry) =>
        entry.profileId === profileId &&
        entry.purpose === purpose &&
        entry.status === "pending" &&
        (!referenceId || entry.referenceId === referenceId),
    );

  if (!record) {
    return { ok: false, reason: "No pending OTP found." };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    record.status = "expired";
    return { ok: false, reason: "OTP has expired." };
  }

  record.attemptCount += 1;
  if (record.attemptCount > record.maxAttempts) {
    record.status = "expired";
    return { ok: false, reason: "Too many attempts." };
  }

  if (record.otpHash !== hashValue(code)) {
    return { ok: false, reason: "Incorrect OTP." };
  }

  record.status = "verified";
  return { ok: true, record };
}
