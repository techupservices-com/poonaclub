import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { createMobileChangeRequest, getMemberById } from "@/lib/data";
import { createOtp } from "@/lib/otp-store";
import { sendOtpMessage } from "@/lib/techup";
import { normalizeMobile } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({ newMobile: z.string().min(10) });
  const body = schema.parse(await request.json());
  const member = await getMemberById(session.subject);
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 });

  const requestRecord = await createMobileChangeRequest({
    profileId: member.id,
    oldMobile: member.currentMobile,
    newMobile: normalizeMobile(body.newMobile),
    status: "pending",
    requestedByProfileId: member.id,
    purpose: "mobile_change",
  });
  const { code } = await createOtp(member.id, normalizeMobile(body.newMobile), "mobile_change", requestRecord.id);
  const delivery = await sendOtpMessage({
    mobile: normalizeMobile(body.newMobile),
    otp: code,
    memberName: member.fullName,
    purpose: "mobile_change",
    clientReference: requestRecord.id,
  });

  return Response.json({
    requestId: requestRecord.id,
    mobile: normalizeMobile(body.newMobile),
    previewCode: "previewCode" in delivery ? delivery.previewCode : undefined,
  });
}
