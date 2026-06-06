import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { addAuditLog, completeMobileChangeRequest, getMobileChangeRequest, reassignMobileLoginOwnerIfNeeded, setMobileLoginOwner } from "@/lib/data";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({ requestId: z.string().min(1), otp: z.string().length(4) });
  const body = schema.parse(await request.json());
  const requestRecord = await getMobileChangeRequest(body.requestId);
  if (!requestRecord) return Response.json({ error: "Change request not found." }, { status: 404 });

  const result = await verifyOtp(session.subject, "mobile_change", body.otp, body.requestId);
  if (!result.ok) return Response.json({ error: result.reason }, { status: 400 });

  await completeMobileChangeRequest(body.requestId);
  await setMobileLoginOwner(requestRecord.newMobile, requestRecord.profileId);
  if (requestRecord.oldMobile) {
    await reassignMobileLoginOwnerIfNeeded(requestRecord.oldMobile);
  }
  await addAuditLog({ actorType: "member", actorId: session.subject, action: "Verified personal mobile change", targetProfileId: session.subject, metadata: { requestId: body.requestId } });
  return Response.json({ message: "New mobile number verified and activated." });
}
