import { addAuditLog } from "@/lib/services/audit-service";
import { sendResendBatchEmails, getDefaultResendFromAddress, type ResendEmailPayload } from "@/lib/email";
import { resolveAdminSelection } from "@/lib/services/admin-selection-service";
import { getRequiredSupabaseClient, type ProfileRow } from "@/lib/services/shared-db";
import { upsertVerificationSnapshots } from "@/lib/services/summary-service";
import type { AdminReviewStep, AdminSelectionMode, MemberDirectoryFilterKey } from "@/lib/types";

const DB_CHUNK_SIZE = 500;
const EMAIL_BATCH_SIZE = 100;

const STEP_LABELS: Record<AdminReviewStep, string> = {
  selfie: "Selfie image",
  mobile: "Mobile number",
  email: "Email address",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getProfilesByIds(profileIds: string[]) {
  if (!profileIds.length) return [] as ProfileRow[];
  const client = getRequiredSupabaseClient();
  const rows: ProfileRow[] = [];
  for (let index = 0; index < profileIds.length; index += DB_CHUNK_SIZE) {
    const chunk = profileIds.slice(index, index + DB_CHUNK_SIZE);
    const { data, error } = await client.from("profiles").select("*").in("id", chunk);
    if (error) throw error;
    rows.push(...((data ?? []) as ProfileRow[]));
  }
  const order = new Map(profileIds.map((id, index) => [id, index]));
  return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildDisapprovalEmail(profile: ProfileRow, steps: AdminReviewStep[], message?: string | null): ResendEmailPayload | null {
  const email = (profile.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return null;

  const stepLabels = steps.map((step) => STEP_LABELS[step]);
  const listHtml = stepLabels.map((label) => `<li>${escapeHtml(label)}</li>`).join("");
  const listText = stepLabels.map((label) => `- ${label}`).join("\n");
  const safeName = escapeHtml(profile.full_name ?? "Member");
  const safeMessage = message?.trim() ? escapeHtml(message.trim()) : "";

  return {
    from: getDefaultResendFromAddress(),
    to: [email],
    subject: "Action required: Poona Club verification update",
    html: `<p>Hi ${safeName},</p><p>Your Poona Club member verification was reviewed by the admin and the following item(s) need to be updated again:</p><ul>${listHtml}</ul>${safeMessage ? `<p><strong>Admin message:</strong><br />${safeMessage}</p>` : ""}<p>Please visit <a href="https://www.pclprofile.com">https://www.pclprofile.com</a>, log in with your registered mobile number or email address, and complete the highlighted step(s).</p><p>Thank you,<br />Poona Club</p>`,
    text: `Hi ${profile.full_name ?? "Member"},\n\nYour Poona Club member verification was reviewed by the admin and the following item(s) need to be updated again:\n${listText}${message?.trim() ? `\n\nAdmin message:\n${message.trim()}` : ""}\n\nPlease visit https://www.pclprofile.com, log in with your registered mobile number or email address, and complete the highlighted step(s).\n\nThank you,\nPoona Club`,
    tags: [
      { name: "category", value: "admin_disapproval" },
      { name: "profile_id", value: profile.id },
    ],
  };
}

export async function sendDisapprovalNotifications(profileIds: string[], steps: AdminReviewStep[], message?: string | null) {
  const profiles = await getProfilesByIds(profileIds);
  const payloads = profiles
    .map((profile) => buildDisapprovalEmail(profile, steps, message))
    .filter((payload): payload is ResendEmailPayload => Boolean(payload));

  for (let index = 0; index < payloads.length; index += EMAIL_BATCH_SIZE) {
    const chunk = payloads.slice(index, index + EMAIL_BATCH_SIZE);
    await sendResendBatchEmails(chunk, `admin-disapproval-${Date.now()}-${index}`);
  }

  return { attempted: payloads.length, skipped: profiles.length - payloads.length };
}

export async function approveMembers(input: {
  adminId: string;
  selectionMode: AdminSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}) {
  const profileIds = await resolveAdminSelection(input);
  if (!profileIds.length) return { count: 0, profileIds };

  const client = getRequiredSupabaseClient();
  const now = new Date().toISOString();

  for (let index = 0; index < profileIds.length; index += DB_CHUNK_SIZE) {
    const chunk = profileIds.slice(index, index + DB_CHUNK_SIZE);
    const rows = chunk.map((profileId) => ({
      profile_id: profileId,
      status: "approved",
      approved_by: input.adminId,
      approved_at: now,
      disapproved_by: null,
      disapproved_at: null,
      disapproved_steps: [],
      disapproval_message: null,
      updated_at: now,
    }));
    const { error: reviewError } = await client.from("member_admin_reviews").upsert(rows, { onConflict: "profile_id" });
    if (reviewError) throw reviewError;

    const { error: profileError } = await client
      .from("profiles")
      .update({ mobile_verified: true, email_verified: true, updated_at: now })
      .in("id", chunk);
    if (profileError) throw profileError;
  }

  await upsertVerificationSnapshots(profileIds);
  for (const profileId of profileIds) {
    await addAuditLog({ actorType: "admin", actorId: input.adminId, action: "Admin approved member", targetProfileId: profileId, metadata: { scope: "admin-review" } });
  }

  return { count: profileIds.length, profileIds };
}

export async function disapproveMembers(input: {
  adminId: string;
  selectionMode: AdminSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
  steps: AdminReviewStep[];
  message?: string | null;
}) {
  const steps = [...new Set(input.steps)];
  if (!steps.length) throw new Error("Select at least one item to disapprove.");
  const profileIds = await resolveAdminSelection(input);
  if (!profileIds.length) return { count: 0, profileIds };

  const client = getRequiredSupabaseClient();
  const now = new Date().toISOString();
  const message = input.message?.trim() || null;

  for (let index = 0; index < profileIds.length; index += DB_CHUNK_SIZE) {
    const chunk = profileIds.slice(index, index + DB_CHUNK_SIZE);
    const rows = chunk.map((profileId) => ({
      profile_id: profileId,
      status: "disapproved",
      approved_by: null,
      approved_at: null,
      disapproved_by: input.adminId,
      disapproved_at: now,
      disapproved_steps: steps,
      disapproval_message: message,
      updated_at: now,
    }));
    const { error: reviewError } = await client.from("member_admin_reviews").upsert(rows, { onConflict: "profile_id" });
    if (reviewError) throw reviewError;

    const profileUpdates = {
      ...(steps.includes("mobile") ? { mobile_verified: false } : {}),
      ...(steps.includes("email") ? { email_verified: false } : {}),
      updated_at: now,
    };
    const { error: profileError } = await client.from("profiles").update(profileUpdates).in("id", chunk);
    if (profileError) throw profileError;
  }

  await upsertVerificationSnapshots(profileIds);
  for (const profileId of profileIds) {
    await addAuditLog({ actorType: "admin", actorId: input.adminId, action: "Admin disapproved member", targetProfileId: profileId, metadata: { scope: "admin-review", steps: steps.join(",") } });
  }

  return { count: profileIds.length, profileIds };
}

export async function clearAdminRejectionSteps(profileId: string, stepsToClear: AdminReviewStep[]) {
  if (!stepsToClear.length) return;
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("member_admin_reviews").select("*").eq("profile_id", profileId).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "disapproved") return;

  const existingSteps = ((data.disapproved_steps ?? []) as AdminReviewStep[]).filter((step) => !stepsToClear.includes(step));
  const now = new Date().toISOString();
  const nextStatus = existingSteps.length ? "disapproved" : "pending";
  const { error: updateError } = await client
    .from("member_admin_reviews")
    .update({
      status: nextStatus,
      disapproved_steps: existingSteps,
      disapproval_message: existingSteps.length ? data.disapproval_message : null,
      updated_at: now,
    })
    .eq("profile_id", profileId);
  if (updateError) throw updateError;
  await upsertVerificationSnapshots([profileId]);
}
