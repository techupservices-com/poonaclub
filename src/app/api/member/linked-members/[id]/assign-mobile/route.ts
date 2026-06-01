import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { createMobileChangeRequest, getMemberById } from "@/lib/data";
import { createOtp } from "@/lib/otp-store";
import { sendOtpMessage } from "@/lib/techup";
import { normalizeMobile } from "@/lib/utils";

export async function POST(request: Request, context: RouteContext<"/api/member/linked-members/[id]/assign-mobile">) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const member = await getMemberById(id);
  if (!member) return Response.json({ error: "Linked member not found." }, { status: 404 });

  const schema = z.object({ newMobile: z.string().min(10) });
  const body = schema.parse(await request.json());
  const normalized = normalizeMobile(body.newMobile);
  const requestRecord = await createMobileChangeRequest({
    profileId: member.id,
    oldMobile: member.currentMobile,
    newMobile: normalized,
    status: "pending",
    requestedByProfileId: session.subject,
    purpose: "linked_member_mobile_change",
  });
  const { code } = await createOtp(member.id, normalized, "linked_member_mobile_change", requestRecord.id);
  const delivery = await sendOtpMessage({
    mobile: normalized,
    otp: code,
    memberName: member.fullName,
    purpose: "linked_member_mobile_change",
    clientReference: requestRecord.id,
  });

  return Response.json({
    message: `Verification message sent for ${member.fullName}.`,
    requestId: requestRecord.id,
    mobile: normalized,
    previewCode: "previewCode" in delivery ? delivery.previewCode : undefined,
  });
}
