import type { BroadcastEmailBatchRow } from "@/lib/services/shared-db";
import { getRequiredSupabaseClient } from "@/lib/services/shared-db";
import { listBroadcastEmailRecipientsForBatch, refreshBroadcastEmailCampaignSummary } from "@/lib/services/broadcast-email-service";
import { sendBroadcastRecipientBatch } from "@/lib/services/resend-batch-service";

const PROCESS_CONCURRENCY = 3;
const CLAIM_MINUTES = 5;
const MAX_ATTEMPTS = 3;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

export function getBroadcastProcessToken() {
  return process.env.SESSION_SECRET ?? "poona-club-dev-session-secret";
}

export async function triggerBroadcastProcessing(origin: string, campaignId: string) {
  const response = await fetch(`${origin}/api/admin/members/bulk-email/campaigns/${campaignId}/process`, {
    method: "POST",
    headers: {
      "x-broadcast-process-token": getBroadcastProcessToken(),
      "User-Agent": "poonaclub/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unable to trigger campaign processing: ${message}`);
  }
}

async function reclaimStaleBatches(campaignId: string) {
  const client = getRequiredSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("broadcast_email_batches")
    .select("id")
    .eq("broadcast_email_id", campaignId)
    .in("status", ["claimed", "sending"])
    .lt("claim_expires_at", now);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.id as string);
  if (!ids.length) return;
  const { error: updateError } = await client
    .from("broadcast_email_batches")
    .update({
      status: "retryable",
      claimed_at: null,
      claim_expires_at: null,
      last_error: "Previous processing wave expired before completion.",
    })
    .in("id", ids);
  if (updateError) throw updateError;
}

async function claimNextBatches(campaignId: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("broadcast_email_batches")
    .select("*")
    .eq("broadcast_email_id", campaignId)
    .in("status", ["pending", "retryable"])
    .order("sequence_no", { ascending: true })
    .limit(PROCESS_CONCURRENCY);
  if (error) throw error;
  const rows = (data ?? []) as BroadcastEmailBatchRow[];
  if (!rows.length) return [] as BroadcastEmailBatchRow[];

  const now = new Date();
  const claimedRows: BroadcastEmailBatchRow[] = [];
  for (const row of rows) {
    const { data: updateData, error: updateError } = await client
      .from("broadcast_email_batches")
      .update({
        status: "sending",
        attempt_count: row.attempt_count + 1,
        claimed_at: now.toISOString(),
        claim_expires_at: addMinutes(now, CLAIM_MINUTES),
        started_at: row.started_at ?? now.toISOString(),
        last_error: null,
      })
      .eq("id", row.id)
      .eq("status", row.status)
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updateData) claimedRows.push(updateData as BroadcastEmailBatchRow);
  }

  return claimedRows;
}

async function processSingleBatch(campaignId: string, batch: BroadcastEmailBatchRow) {
  const client = getRequiredSupabaseClient();
  const recipients = await listBroadcastEmailRecipientsForBatch(batch.id);
  if (!recipients.length) {
    await client
      .from("broadcast_email_batches")
      .update({
        status: "completed",
        processed_count: 0,
        success_count: 0,
        failure_count: 0,
        completed_at: new Date().toISOString(),
        claim_expires_at: null,
      })
      .eq("id", batch.id);
    return;
  }

  const sendResult = await sendBroadcastRecipientBatch({
    subject: "Complete your Poona Club verification",
    recipients,
    idempotencyKey: `${batch.idempotency_key}:${batch.attempt_count + 1}`,
  });

  const now = new Date().toISOString();
  if (sendResult.ok) {
    const recipientUpdates = recipients.map((recipient, index) => ({
      id: recipient.id,
      broadcast_email_id: recipient.broadcastEmailId,
      batch_id: recipient.batchId ?? null,
      profile_id: recipient.profileId ?? null,
      email: recipient.email,
      full_name: recipient.fullName,
      status: sendResult.messageIds[index] ? "sent_to_provider" : "failed",
      provider_message_id: sendResult.messageIds[index],
      provider_last_event: sendResult.messageIds[index] ? "email.sent" : null,
      skip_reason: recipient.skipReason ?? null,
      error_message: sendResult.messageIds[index] ? null : "Resend did not return a message id.",
      created_at: recipient.createdAt,
      updated_at: now,
    }));
    const { error: recipientError } = await client.from("broadcast_email_recipients").upsert(recipientUpdates);
    if (recipientError) throw recipientError;

    const successCount = recipientUpdates.filter((row) => row.status === "sent_to_provider").length;
    const failureCount = recipientUpdates.length - successCount;
    const { error: batchError } = await client
      .from("broadcast_email_batches")
      .update({
        status: "completed",
        processed_count: recipientUpdates.length,
        success_count: successCount,
        failure_count: failureCount,
        completed_at: now,
        claim_expires_at: null,
        last_error: failureCount ? "Some recipients were not accepted by Resend." : null,
      })
      .eq("id", batch.id);
    if (batchError) throw batchError;
    return;
  }

  const terminal = batch.attempt_count + 1 >= MAX_ATTEMPTS || !sendResult.retryable;
  const { error: batchError } = await client
    .from("broadcast_email_batches")
    .update({
      status: terminal ? "failed" : "retryable",
      processed_count: terminal ? recipients.length : 0,
      success_count: 0,
      failure_count: terminal ? recipients.length : 0,
      completed_at: terminal ? now : null,
      claim_expires_at: null,
      last_error: sendResult.errorMessage ?? "Batch send failed.",
    })
    .eq("id", batch.id);
  if (batchError) throw batchError;

  if (terminal) {
    const recipientUpdates = recipients.map((recipient) => ({
      id: recipient.id,
      broadcast_email_id: recipient.broadcastEmailId,
      batch_id: recipient.batchId ?? null,
      profile_id: recipient.profileId ?? null,
      email: recipient.email,
      full_name: recipient.fullName,
      status: "failed",
      skip_reason: recipient.skipReason ?? null,
      created_at: recipient.createdAt,
      error_message: sendResult.errorMessage ?? "Batch send failed.",
      updated_at: now,
    }));
    const { error: recipientError } = await client.from("broadcast_email_recipients").upsert(recipientUpdates);
    if (recipientError) throw recipientError;
  }

  await client.from("broadcast_emails").update({ last_error: sendResult.errorMessage ?? "Batch send failed." }).eq("id", campaignId);
}

export async function processBroadcastEmailCampaignWave(campaignId: string) {
  const client = getRequiredSupabaseClient();
  await reclaimStaleBatches(campaignId);
  await client
    .from("broadcast_emails")
    .update({ status: "processing" })
    .eq("id", campaignId)
    .in("status", ["queued", "processing"]);

  const claimedBatches = await claimNextBatches(campaignId);
  await Promise.all(claimedBatches.map((batch) => processSingleBatch(campaignId, batch)));

  const summary = await refreshBroadcastEmailCampaignSummary(campaignId);
  const { count, error } = await client
    .from("broadcast_email_batches")
    .select("id", { count: "exact", head: true })
    .eq("broadcast_email_id", campaignId)
    .in("status", ["pending", "claimed", "sending", "retryable"]);
  if (error) throw error;

  return {
    hasMore: (count ?? 0) > 0,
    claimedCount: claimedBatches.length,
    campaign: summary,
  };
}
