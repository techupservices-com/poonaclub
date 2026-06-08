import type { AuditLog } from "@/lib/types";
import { fetchAllRows, getRequiredSupabaseClient, type AuditRow, mapAudit } from "@/lib/services/shared-db";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function listAuditLogs() {
  const rows = await fetchAllRows<AuditRow>("audit_logs", "*", "created_at");
  return rows.map(mapAudit).reverse();
}

export async function addAuditLog(log: Omit<AuditLog, "id" | "createdAt">) {
  const client = getRequiredSupabaseClient();
  const payload = {
    actor_type: log.actorType,
    actor_profile_id: isUuid(log.actorId) ? log.actorId : null,
    action: log.action,
    target_profile_id: log.targetProfileId,
    metadata: log.metadata,
  };
  const { error } = await client.from("audit_logs").insert(payload);
  if (error) throw error;
}
