import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { addAuditLog, updateMember } from "@/lib/data";

export async function PATCH(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({
    email: z.string().email(),
    address1: z.string().min(2),
    address2: z.string().optional().default(""),
    address3: z.string().optional().default(""),
    city: z.string().min(2),
    pincode: z.string().min(4),
  });
  const body = schema.parse(await request.json());
  await updateMember(session.subject, body);
  await addAuditLog({ actorType: "member", actorId: session.subject, action: "Updated own profile", targetProfileId: session.subject, metadata: { scope: "profile" } });
  return Response.json({ message: "Profile updated successfully." });
}

export async function GET() {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ profileId: session.subject });
}
