import { randomUUID } from "crypto";
import type {
  BroadcastEmailBatch,
  BroadcastEmailCampaign,
  BroadcastEmailCampaignDetail,
  BroadcastEmailPreview,
  BroadcastEmailRecipient,
  BroadcastEmailSelectionMode,
  MemberDirectoryFilterKey,
} from "@/lib/types";
import {
  getRequiredSupabaseClient,
  type BroadcastEmailBatchRow,
  type BroadcastEmailRecipientRow,
  type BroadcastEmailRow,
  type MemberVerificationSnapshotRow,
} from "@/lib/services/shared-db";

const BROADCAST_TEMPLATE_KEY = "verification_reminder";
const BATCH_SIZE = 100;
const STATUS_PRECEDENCE: Record<BroadcastEmailRecipient["status"], number> = {
  pending: 0,
  sent_to_provider: 1,
  delivered: 2,
  bounced: 3,
  complained: 3,
  failed: 3,
  skipped: 3,
};

interface RecipientCandidate {
  profileId: string;
  email: string;
  fullName: string;
}

function applySummaryQueryFilters<T>(queryBuilder: T, query: string, filters: MemberDirectoryFilterKey[]) {
  let qb = queryBuilder as {
    or: (filter: string) => typeof queryBuilder;
    eq: (column: string, value: unknown) => typeof queryBuilder;
    gt: (column: string, value: number) => typeof queryBuilder;
  };
  const search = query.trim();

  if (search) {
    const value = `%${search}%`;
    qb = qb.or(
      `full_name.ilike.${value},membership_id.ilike.${value},current_mobile.ilike.${value},email.ilike.${value}`,
    ) as typeof qb;
  }

  if (filters.includes("verified")) qb = qb.eq("completed", true) as typeof qb;
  if (filters.includes("inprogress")) {
    qb = qb.eq("completed", false) as typeof qb;
    qb = qb.or("mobile_verified.eq.true,email_verified.eq.true,selfie_uploaded.eq.true") as typeof qb;
  }
  if (filters.includes("notstarted")) {
    qb = qb.eq("completed", false) as typeof qb;
    qb = qb.eq("mobile_verified", false) as typeof qb;
    qb = qb.eq("email_verified", false) as typeof qb;
    qb = qb.eq("selfie_uploaded", false) as typeof qb;
  }
  if (filters.includes("shared")) qb = qb.gt("shared_mobile_count", 1) as typeof qb;

  return qb as T;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapCampaign(row: BroadcastEmailRow): BroadcastEmailCampaign {
  return {
    id: row.id,
    createdBy: row.created_by,
    selectionMode: row.selection_mode,
    queryText: row.query_text,
    filterFlags: (row.filter_flags ?? []) as MemberDirectoryFilterKey[],
    templateKey: row.template_key,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    status: row.status,
    totalResolved: row.total_resolved,
    totalValid: row.total_valid,
    totalSkipped: row.total_skipped,
    totalBatches: row.total_batches,
    batchesCompleted: row.batches_completed,
    sentToProviderCount: row.sent_to_provider_count,
    deliveredCount: row.delivered_count,
    bouncedCount: row.bounced_count,
    complainedCount: row.complained_count,
    failedCount: row.failed_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapBatch(row: BroadcastEmailBatchRow): BroadcastEmailBatch {
  return {
    id: row.id,
    broadcastEmailId: row.broadcast_email_id,
    sequenceNo: row.sequence_no,
    status: row.status,
    recipientCount: row.recipient_count,
    processedCount: row.processed_count,
    successCount: row.success_count,
    failureCount: row.failure_count,
    attemptCount: row.attempt_count,
    claimedAt: row.claimed_at,
    claimExpiresAt: row.claim_expires_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    idempotencyKey: row.idempotency_key,
    lastError: row.last_error,
  };
}

function mapRecipient(row: BroadcastEmailRecipientRow): BroadcastEmailRecipient {
  return {
    id: row.id,
    broadcastEmailId: row.broadcast_email_id,
    batchId: row.batch_id ?? undefined,
    profileId: row.profile_id ?? undefined,
    email: row.email,
    fullName: row.full_name,
    status: row.status,
    skipReason: row.skip_reason,
    providerMessageId: row.provider_message_id,
    providerLastEvent: row.provider_last_event,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getVerificationReminderTemplate() {
  return {
    key: BROADCAST_TEMPLATE_KEY,
    subject: "Complete your Poona Club verification",
    renderHtml: (fullName: string) =>
      `<p>Hi ${escapeHtml(fullName)},</p><p>This is a reminder to complete your Poona Club verification on <a href="https://www.pclprofile.com">pclprofile.com</a>.</p><p>Please log in with your registered email address or mobile number and finish the pending steps at the earliest.</p><p>Thank you,<br />Poona Club</p>`,
    renderText: (fullName: string) =>
      `Hi ${fullName},\n\nThis is a reminder to complete your Poona Club verification on https://www.pclprofile.com. Please log in with your registered email address or mobile number and finish the pending steps at the earliest.\n\nThank you,\nPoona Club`,
  };
}

export function getBroadcastTemplateByKey(templateKey: string) {
  if (templateKey === BROADCAST_TEMPLATE_KEY) {
    return getVerificationReminderTemplate();
  }
  throw new Error(`Unsupported broadcast template: ${templateKey}`);
}

export function renderBroadcastTemplate(templateKey: string, fullName: string) {
  const template = getBroadcastTemplateByKey(templateKey);
  return {
    subject: template.subject,
    html: template.renderHtml(fullName),
    text: template.renderText(fullName),
  };
}

async function listSnapshotRecipientsByFilter(query: string, filters: MemberDirectoryFilterKey[]) {
  const client = getRequiredSupabaseClient();
  const results: RecipientCandidate[] = [];
  let from = 0;

  while (true) {
    const response = await applySummaryQueryFilters(
      client
        .from("member_verification_snapshot")
        .select("profile_id,email,full_name")
        .order("membership_id", { ascending: true })
        .range(from, from + 999),
      query,
      filters,
    );

    if (response.error) throw response.error;
    const rows = (response.data ?? []) as Pick<MemberVerificationSnapshotRow, "profile_id" | "email" | "full_name">[];
    results.push(
      ...rows.map((row) => ({
        profileId: row.profile_id,
        email: row.email ?? "",
        fullName: row.full_name ?? "Member",
      })),
    );
    if (rows.length < 1000) break;
    from += 1000;
  }

  return results;
}

async function listSnapshotRecipientsByIds(profileIds: string[]) {
  if (!profileIds.length) return [] as RecipientCandidate[];
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_verification_snapshot")
    .select("profile_id,email,full_name")
    .in("profile_id", profileIds);
  if (error) throw error;
  const rows = (data ?? []) as Pick<MemberVerificationSnapshotRow, "profile_id" | "email" | "full_name">[];
  const order = new Map(profileIds.map((id, index) => [id, index]));
  return rows
    .map((row) => ({ profileId: row.profile_id, email: row.email ?? "", fullName: row.full_name ?? "Member" }))
    .sort((a, b) => (order.get(a.profileId) ?? 0) - (order.get(b.profileId) ?? 0));
}

async function resolveRecipientCandidates(input: {
  selectionMode: BroadcastEmailSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}) {
  if (input.selectionMode === "selected_visible") {
    return listSnapshotRecipientsByIds(input.selectedIds ?? []);
  }
  return listSnapshotRecipientsByFilter(input.query ?? "", input.filters ?? []);
}

function buildRecipientPlan(candidates: RecipientCandidate[]) {
  const seenEmails = new Set<string>();
  const validRecipients: RecipientCandidate[] = [];
  const skippedRecipients: Array<RecipientCandidate & { skipReason: string }> = [];

  for (const candidate of candidates) {
    const email = normalizeEmail(candidate.email);
    if (!email) {
      skippedRecipients.push({ ...candidate, email, skipReason: "missing_email" });
      continue;
    }
    if (!isValidEmail(email)) {
      skippedRecipients.push({ ...candidate, email, skipReason: "invalid_email" });
      continue;
    }
    if (seenEmails.has(email)) {
      skippedRecipients.push({ ...candidate, email, skipReason: "duplicate_email" });
      continue;
    }
    seenEmails.add(email);
    validRecipients.push({ ...candidate, email });
  }

  return { validRecipients, skippedRecipients };
}

export async function previewBroadcastEmail(input: {
  selectionMode: BroadcastEmailSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}): Promise<BroadcastEmailPreview> {
  const candidates = await resolveRecipientCandidates(input);
  const { validRecipients, skippedRecipients } = buildRecipientPlan(candidates);
  return {
    totalResolved: candidates.length,
    totalValid: validRecipients.length,
    totalSkipped: skippedRecipients.length,
    samples: validRecipients.slice(0, 4).map((recipient) => ({
      profileId: recipient.profileId,
      email: recipient.email,
      fullName: recipient.fullName,
    })),
  };
}

export async function createBroadcastEmailCampaign(input: {
  adminId: string;
  selectionMode: BroadcastEmailSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}) {
  const client = getRequiredSupabaseClient();
  const template = getVerificationReminderTemplate();
  const candidates = await resolveRecipientCandidates(input);
  const { validRecipients, skippedRecipients } = buildRecipientPlan(candidates);
  const campaignId = randomUUID();
  const now = new Date().toISOString();

  const batches = validRecipients.reduce<Array<{ id: string; sequenceNo: number; recipients: RecipientCandidate[] }>>((acc, recipient, index) => {
    const bucket = Math.floor(index / BATCH_SIZE);
    if (!acc[bucket]) {
      acc[bucket] = {
        id: randomUUID(),
        sequenceNo: bucket + 1,
        recipients: [],
      };
    }
    acc[bucket].recipients.push(recipient);
    return acc;
  }, []);

  const recipientRows = [
    ...validRecipients.map((recipient, index) => {
      const batch = batches[Math.floor(index / BATCH_SIZE)];
      return {
        id: randomUUID(),
        broadcast_email_id: campaignId,
        batch_id: batch.id,
        profile_id: recipient.profileId,
        email: recipient.email,
        full_name: recipient.fullName,
        status: "pending",
        skip_reason: null,
        provider_message_id: null,
        provider_last_event: null,
        error_message: null,
        created_at: now,
        updated_at: now,
      };
    }),
    ...skippedRecipients.map((recipient) => ({
      id: randomUUID(),
      broadcast_email_id: campaignId,
      batch_id: null,
      profile_id: recipient.profileId,
      email: recipient.email,
      full_name: recipient.fullName,
      status: "skipped",
      skip_reason: recipient.skipReason,
      provider_message_id: null,
      provider_last_event: null,
      error_message: null,
      created_at: now,
      updated_at: now,
    })),
  ];

  const batchRows = batches.map((batch) => ({
    id: batch.id,
    broadcast_email_id: campaignId,
    sequence_no: batch.sequenceNo,
    status: "pending",
    recipient_count: batch.recipients.length,
    processed_count: 0,
    success_count: 0,
    failure_count: 0,
    attempt_count: 0,
    claimed_at: null,
    claim_expires_at: null,
    started_at: null,
    completed_at: null,
    idempotency_key: `${campaignId}:${batch.sequenceNo}`,
    last_error: null,
  }));

  const campaignRow = {
    id: campaignId,
    created_by: input.adminId,
    selection_mode: input.selectionMode,
    query_text: input.query ?? "",
    filter_flags: input.filters ?? [],
    template_key: template.key,
    subject: template.subject,
    body_html: template.renderHtml("Member"),
    body_text: template.renderText("Member"),
    status: validRecipients.length ? "queued" : "completed",
    total_resolved: candidates.length,
    total_valid: validRecipients.length,
    total_skipped: skippedRecipients.length,
    total_batches: batchRows.length,
    batches_completed: validRecipients.length ? 0 : batchRows.length,
    sent_to_provider_count: 0,
    delivered_count: 0,
    bounced_count: 0,
    complained_count: 0,
    failed_count: 0,
    last_error: null,
    created_at: now,
    started_at: null,
    completed_at: validRecipients.length ? null : now,
  };

  try {
    const { error: campaignError } = await client.from("broadcast_emails").insert(campaignRow);
    if (campaignError) throw campaignError;

    if (batchRows.length) {
      const { error: batchError } = await client.from("broadcast_email_batches").insert(batchRows);
      if (batchError) throw batchError;
    }

    for (let index = 0; index < recipientRows.length; index += 1000) {
      const chunk = recipientRows.slice(index, index + 1000);
      const { error } = await client.from("broadcast_email_recipients").insert(chunk);
      if (error) throw error;
    }
  } catch (error) {
    await client.from("broadcast_emails").delete().eq("id", campaignId);
    throw error;
  }

  return getBroadcastEmailCampaign(campaignId);
}

export async function getBroadcastEmailCampaignRow(id: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("broadcast_emails").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as BroadcastEmailRow | null) ?? null;
}

export async function listBroadcastEmailCampaigns(limit = 5) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.from("broadcast_emails").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as BroadcastEmailRow[]).map(mapCampaign);
}

export async function getBroadcastEmailCampaign(id: string): Promise<BroadcastEmailCampaignDetail | null> {
  const client = getRequiredSupabaseClient();
  const [{ data: campaignData, error: campaignError }, { data: batchData, error: batchError }] = await Promise.all([
    client.from("broadcast_emails").select("*").eq("id", id).maybeSingle(),
    client.from("broadcast_email_batches").select("*").eq("broadcast_email_id", id).order("sequence_no", { ascending: true }),
  ]);
  if (campaignError) throw campaignError;
  if (batchError) throw batchError;
  if (!campaignData) return null;
  return {
    ...mapCampaign(campaignData as BroadcastEmailRow),
    batches: ((batchData ?? []) as BroadcastEmailBatchRow[]).map(mapBatch),
  };
}

export async function listBroadcastEmailRecipientsForBatch(batchId: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("broadcast_email_recipients")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as BroadcastEmailRecipientRow[]).map(mapRecipient);
}

export async function refreshBroadcastEmailCampaignSummary(campaignId: string) {
  const client = getRequiredSupabaseClient();
  const [campaignRes, batchRes, recipientRes] = await Promise.all([
    client.from("broadcast_emails").select("*").eq("id", campaignId).maybeSingle(),
    client.from("broadcast_email_batches").select("status").eq("broadcast_email_id", campaignId),
    client.from("broadcast_email_recipients").select("status").eq("broadcast_email_id", campaignId),
  ]);

  if (campaignRes.error) throw campaignRes.error;
  if (batchRes.error) throw batchRes.error;
  if (recipientRes.error) throw recipientRes.error;
  if (!campaignRes.data) return null;

  const batchRows = (batchRes.data ?? []) as Array<Pick<BroadcastEmailBatchRow, "status">>;
  const recipientRows = (recipientRes.data ?? []) as Array<Pick<BroadcastEmailRecipientRow, "status">>;
  const batchesCompleted = batchRows.filter((row) => row.status === "completed").length;
  const failedCount = recipientRows.filter((row) => row.status === "failed").length;
  const sentToProviderCount = recipientRows.filter((row) => row.status === "sent_to_provider").length;
  const deliveredCount = recipientRows.filter((row) => row.status === "delivered").length;
  const bouncedCount = recipientRows.filter((row) => row.status === "bounced").length;
  const complainedCount = recipientRows.filter((row) => row.status === "complained").length;
  const activeBatchCount = batchRows.filter((row) => row.status === "pending" || row.status === "claimed" || row.status === "sending" || row.status === "retryable").length;

  let status = (campaignRes.data as BroadcastEmailRow).status;
  let completedAt: string | null = (campaignRes.data as BroadcastEmailRow).completed_at;
  const now = new Date().toISOString();
  if (activeBatchCount === 0) {
    status = failedCount || bouncedCount || complainedCount ? "completed_with_errors" : "completed";
    completedAt = completedAt ?? now;
  } else if (status !== "cancelled") {
    status = "processing";
  }

  const updates = {
    status,
    batches_completed: batchesCompleted,
    sent_to_provider_count: sentToProviderCount,
    delivered_count: deliveredCount,
    bounced_count: bouncedCount,
    complained_count: complainedCount,
    failed_count: failedCount,
    completed_at: completedAt,
    started_at: (campaignRes.data as BroadcastEmailRow).started_at ?? now,
    last_error: failedCount || activeBatchCount > 0 ? (campaignRes.data as BroadcastEmailRow).last_error : null,
  };

  const { error } = await client.from("broadcast_emails").update(updates).eq("id", campaignId);
  if (error) throw error;

  return getBroadcastEmailCampaign(campaignId);
}

export async function updateBroadcastEmailRecipientEvent(providerMessageId: string, eventType: string) {
  const client = getRequiredSupabaseClient();
  const statusMap: Record<string, BroadcastEmailRecipient["status"]> = {
    "email.sent": "sent_to_provider",
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.failed": "failed",
    "email.suppressed": "failed",
  };
  const nextStatus = statusMap[eventType];
  if (!nextStatus) return null;

  const { data: recipientData, error: fetchError } = await client
    .from("broadcast_email_recipients")
    .select("id,broadcast_email_id,status")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!recipientData) return null;

  const currentStatus = recipientData.status as BroadcastEmailRecipient["status"];
  if (STATUS_PRECEDENCE[nextStatus] < STATUS_PRECEDENCE[currentStatus]) {
    return recipientData.broadcast_email_id as string;
  }

  const { data, error } = await client
    .from("broadcast_email_recipients")
    .update({ status: nextStatus, provider_last_event: eventType, updated_at: new Date().toISOString() })
    .eq("id", recipientData.id as string)
    .select("broadcast_email_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  await refreshBroadcastEmailCampaignSummary(data.broadcast_email_id as string);
  return data.broadcast_email_id as string;
}
