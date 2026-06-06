import { z } from "zod";
import { ensureMobileLoginOwner, findMemberByEmail } from "@/lib/data";
import { sendEmailOtp } from "@/lib/email";
import { createOtp } from "@/lib/otp-store";
import { sendSmsOtp } from "@/lib/sms";
import { sendOtpMessage } from "@/lib/techup";

export async function POST(request: Request) {
  const schema = z.object({
    identifier: z.string().min(3),
    identifierType: z.enum(["mobile", "email"]),
    deliveryChannel: z.enum(["sms", "whatsapp", "email"]),
  });
  const body = schema.parse(await request.json());

  if (body.identifierType === "email" && body.deliveryChannel !== "email") {
    return Response.json({ error: "Email login requires email OTP delivery." }, { status: 400 });
  }

  if (body.identifierType === "mobile" && body.deliveryChannel === "email") {
    return Response.json({ error: "Mobile login cannot use email OTP delivery." }, { status: 400 });
  }

  const member =
    body.identifierType === "email"
      ? await findMemberByEmail(body.identifier)
      : await ensureMobileLoginOwner(body.identifier);

  if (!member) {
    return Response.json({ error: "No member found with that mobile number or email address." }, { status: 404 });
  }

  if (body.identifierType === "email" && !member.email) {
    return Response.json({ error: "This member does not have an email address on record." }, { status: 400 });
  }

  if (body.identifierType === "mobile" && !member.currentMobile) {
    return Response.json({ error: "This member does not have a mobile number on record." }, { status: 400 });
  }

  const destination = body.identifierType === "email" ? member.email : member.currentMobile;
  const { record, code } = await createOtp(
    member.id,
    destination,
    "login",
    body.identifierType,
    body.deliveryChannel,
  );
  try {
    const delivery =
      body.deliveryChannel === "whatsapp"
        ? await sendOtpMessage({
            mobile: member.currentMobile,
            otp: code,
            memberName: member.fullName,
            purpose: "login",
            clientReference: record.id,
          })
        : body.deliveryChannel === "sms"
          ? await sendSmsOtp({ mobile: member.currentMobile, otp: code })
          : await sendEmailOtp({ email: member.email, otp: code, memberName: member.fullName });

    return Response.json({
      profileId: member.id,
      mobile: member.currentMobile,
      email: member.email,
      identifierType: body.identifierType,
      deliveryChannel: body.deliveryChannel,
      previewCode: "previewCode" in delivery ? delivery.previewCode : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send OTP through WhatsApp provider.",
      },
      { status: 502 },
    );
  }
}
