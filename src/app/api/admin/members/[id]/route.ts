import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { addAuditLog, getMemberById, updateMember } from "@/lib/data";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/members/[id]">) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const member = await getMemberById(id);
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 });

  const schema = z.object({
    email: z.string(),
    currentMobile: z.string(),
    address1: z.string(),
    address2: z.string(),
    address3: z.string(),
    city: z.string(),
    pincode: z.string(),
    status: z.string(),
  });
  const body = schema.parse(await request.json());
  await updateMember(id, body);
  await addAuditLog({ actorType: "admin", actorId: session.subject, action: "Admin updated member", targetProfileId: id, metadata: { scope: "admin-edit" } });
  return Response.json({ message: "Member details updated." });
}
