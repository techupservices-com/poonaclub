import { z } from "zod";
import { getMemberSession } from "@/lib/auth";
import { addAuditLog, findVerifiedEmailOwnerFast, getMemberByIdForAuth, updateMember } from "@/lib/data";
import { sendEmailOtp } from "@/lib/email";
import { createOtp } from "@/lib/otp-store";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const schema = z.object({ email: z.string().email() });
    const body = schema.parse(await request.json());
    const member = await getMemberByIdForAuth(session.subject);
    if (!member) return Response.json({ error: "Member not found." }, { status: 404 });

    const verifiedOwner = await findVerifiedEmailOwnerFast(body.email, member.id);
    if (verifiedOwner) {
      return Response.json(
        { error: "This email address is already linked to another verified member account. Please use another email address." },
        { status: 400 },
      );
    }

    await updateMember(member.id, { email: body.email, emailVerified: false });
    const { record, code } = await createOtp(member.id, body.email, "email_verify", "email", "email");
    await sendEmailOtp({ email: body.email, otp: code, memberName: member.fullName });
    await addAuditLog({ actorType: "member", actorId: member.id, action: "Requested email verification OTP", targetProfileId: member.id, metadata: { scope: "email-otp" } });

    return Response.json({ requestId: record.id, email: body.email, previewCode: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email OTP. Please try again after some time.";
    return Response.json({ error: message }, { status: 502 });
  }
}
