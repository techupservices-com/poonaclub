import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { createMobileChangeRequest, findVerifiedMobileOwner, getMemberById } from "@/lib/data";
import { createOtp } from "@/lib/otp-store";
import { sendSmsOtp } from "@/lib/sms";
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
  const verifiedOwner = await findVerifiedMobileOwner(normalized, member.id);
  if (verifiedOwner) {
    return Response.json(
      { error: "This mobile number is already linked to another verified member account. Please use another mobile number." },
      { status: 400 },
    );
  }
  const requestRecord = await createMobileChangeRequest({
    profileId: member.id,
    oldMobile: member.currentMobile,
    newMobile: normalized,
    status: "pending",
    requestedByProfileId: session.subject,
    purpose: "linked_member_mobile_change",
  });
  const { code } = await createOtp(
    member.id,
    normalized,
    "linked_member_mobile_change",
    "mobile",
    "mobile",
    requestRecord.id,
  );
  const delivery = await Promise.all([
    sendSmsOtp({ mobile: normalized, otp: code }),
    sendOtpMessage({
      mobile: normalized,
      otp: code,
      memberName: member.fullName,
      purpose: "linked_member_mobile_change",
      clientReference: requestRecord.id,
    }),
  ]).then(([smsDelivery, whatsappDelivery]) => ({ ...smsDelivery, previewCode: (whatsappDelivery as { previewCode?: string }).previewCode }));

  return Response.json({
    message: `Verification message sent for ${member.fullName}.`,
    requestId: requestRecord.id,
    mobile: normalized,
    previewCode: "previewCode" in delivery ? delivery.previewCode : undefined,
  });
}
