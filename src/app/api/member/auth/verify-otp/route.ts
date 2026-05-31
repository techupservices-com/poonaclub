import { z } from "zod";
import { MEMBER_SESSION_COOKIE } from "@/lib/constants";
import { createSessionToken } from "@/lib/auth";
import { addAuditLog, updateMember } from "@/lib/data";
import { verifyOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  const schema = z.object({ profileId: z.string().min(1), otp: z.string().length(6) });
  const body = schema.parse(await request.json());
  const result = await verifyOtp(body.profileId, "login", body.otp);

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  await updateMember(body.profileId, { mobileVerified: true });
  await addAuditLog({
    actorType: "member",
    actorId: body.profileId,
    action: "Verified login mobile via OTP",
    targetProfileId: body.profileId,
    metadata: { scope: "login-otp" },
  });

  const response = Response.json({ message: "Verified." });
  response.headers.append(
    "Set-Cookie",
    `${MEMBER_SESSION_COOKIE}=${createSessionToken(body.profileId, "member")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );

  return response;
}
