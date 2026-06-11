import { getDefaultResendFromAddress, sendResendBatchEmails } from "@/lib/email";
import { renderBroadcastTemplate } from "@/lib/services/broadcast-email-service";
import type { BroadcastEmailRecipient } from "@/lib/types";

export interface BatchSendResult {
  ok: boolean;
  retryable: boolean;
  errorMessage?: string;
  messageIds: Array<string | null>;
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const status = (error as Error & { status?: number }).status;
  return status === 429 || (typeof status === "number" && status >= 500) || error.message.toLowerCase().includes("timed out");
}

export async function sendBroadcastRecipientBatch({
  templateKey,
  subject,
  recipients,
  idempotencyKey,
}: {
  templateKey: string;
  subject: string;
  recipients: BroadcastEmailRecipient[];
  idempotencyKey: string;
}): Promise<BatchSendResult> {
  try {
    const response = await sendResendBatchEmails(
      recipients.map((recipient) => {
        const rendered = renderBroadcastTemplate(templateKey, recipient.fullName);
        return {
          from: getDefaultResendFromAddress(),
          to: [recipient.email],
          subject: subject || rendered.subject,
          html: rendered.html,
          text: rendered.text,
          tags: [
            { name: "recipient_id", value: recipient.id },
            { name: "broadcast_id", value: recipient.broadcastEmailId },
            { name: "batch_id", value: recipient.batchId ?? "unassigned" },
          ],
        };
      }),
      idempotencyKey,
    );

    const messageIds = recipients.map((_, index) => response.data?.[index]?.id ?? null);
    return {
      ok: true,
      retryable: false,
      messageIds,
    };
  } catch (error) {
    return {
      ok: false,
      retryable: isRetryableError(error),
      errorMessage: error instanceof Error ? error.message : "Unknown batch send error",
      messageIds: recipients.map(() => null),
    };
  }
}
