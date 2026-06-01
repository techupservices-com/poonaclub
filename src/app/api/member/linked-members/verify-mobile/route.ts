import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { addAuditLog, completeMobileChangeRequest, getMobileChangeRequest } from "@/lib/data";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({ requestId: z.string().min(1), otp: z.string().length(6) });
  const body = schema.parse(await request.json());
  const requestRecord = await getMobileChangeRequest(body.requestId);

  if (!requestRecord) {
    return Response.json({ error: "Linked member request not found." }, { status: 404 });
  }

  if (requestRecord.requestedByProfileId !== session.subject) {
    return Response.json({ error: "You cannot verify this linked member request." }, { status: 403 });
  }

  const result = await verifyOtp(
    requestRecord.profileId,
    "linked_member_mobile_change",
    body.otp,
    body.requestId,
  );

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  await completeMobileChangeRequest(body.requestId);
  await addAuditLog({
    actorType: "member",
    actorId: session.subject,
    action: "Verified linked member mobile change",
    targetProfileId: requestRecord.profileId,
    metadata: { requestId: body.requestId },
  });

  return Response.json({ message: "Linked member mobile number verified and activated." });
}
