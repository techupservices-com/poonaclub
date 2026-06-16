import { z } from "zod";
import { MEMBER_SESSION_COOKIE } from "@/lib/constants";
import { createSessionToken } from "@/lib/auth";
import { addAuditLog, getMemberById, setMobileLoginOwner, updateMember } from "@/lib/data";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  const schema = z.object({
    profileId: z.string().min(1),
    otp: z.string().length(4),
    identifierType: z.enum(["mobile", "email"]),
    deliveryChannel: z.enum(["mobile", "email"]),
  });
  const body = schema.parse(await request.json());
  const result = await verifyOtp(body.profileId, "login", body.otp);

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  await updateMember(body.profileId, {
    ...(body.identifierType === "mobile" ? { mobileVerified: true } : {}),
    ...(body.identifierType === "email" ? { emailVerified: true } : {}),
  });

  if (body.identifierType === "mobile") {
    const member = await getMemberById(body.profileId);
    if (member?.currentMobile) {
      await setMobileLoginOwner(member.currentMobile, member.id);
    }
  }

  await addAuditLog({
    actorType: "member",
    actorId: body.profileId,
    action: `Verified login ${body.identifierType} via ${body.deliveryChannel} OTP`,
    targetProfileId: body.profileId,
    metadata: { scope: "login-otp", identifierType: body.identifierType, deliveryChannel: body.deliveryChannel },
  });

  const response = Response.json({ message: "Verified." });
  response.headers.append(
    "Set-Cookie",
    `${MEMBER_SESSION_COOKIE}=${createSessionToken(body.profileId, "member", { loginIdentifierType: body.identifierType })}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );

  return response;
}
