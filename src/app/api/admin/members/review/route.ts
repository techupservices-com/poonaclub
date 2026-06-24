import { after } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { approveMembers, disapproveMembers, sendDisapprovalNotifications } from "@/lib/services/admin-review-service";

const filterSchema = z.enum(["verified", "approved", "disapproved", "shared", "inprogress", "notstarted"]);

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    selectionMode: z.enum(["selected_ids", "all_filtered"]),
    selectedIds: z.array(z.string().uuid()).optional(),
    query: z.string().optional(),
    filters: z.array(filterSchema).optional(),
  }),
  z.object({
    action: z.literal("disapprove"),
    selectionMode: z.enum(["selected_ids", "all_filtered"]),
    selectedIds: z.array(z.string().uuid()).optional(),
    query: z.string().optional(),
    filters: z.array(filterSchema).optional(),
    steps: z.array(z.enum(["selfie", "mobile", "email"])).min(1),
    message: z.string().max(2000).optional(),
  }),
]);

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());

  if (body.action === "approve") {
    const result = await approveMembers({
      adminId: session.subject,
      selectionMode: body.selectionMode,
      selectedIds: body.selectedIds,
      query: body.query,
      filters: body.filters,
    });
    return Response.json({ message: `Approved ${result.count} member${result.count === 1 ? "" : "s"}.`, count: result.count });
  }

  const result = await disapproveMembers({
    adminId: session.subject,
    selectionMode: body.selectionMode,
    selectedIds: body.selectedIds,
    query: body.query,
    filters: body.filters,
    steps: body.steps,
    message: body.message,
  });

  if (result.profileIds.length) {
    after(async () => {
      await sendDisapprovalNotifications(result.profileIds, body.steps, body.message);
    });
  }

  return Response.json({ message: `Disapproved ${result.count} member${result.count === 1 ? "" : "s"}. Notification emails are queued.`, count: result.count });
}
