import { getMemberSession } from "@/lib/auth";
import { addAuditLog, findVerifiedEmailOwnerFast, getMemberByIdForAuth, updateMember, upsertVerificationSnapshot } from "@/lib/data";

export async function POST() {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getMemberByIdForAuth(session.subject);
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 });
  if (!member.email) {
    return Response.json({ error: "No registered email address found. Please use Edit to add an email ID." }, { status: 400 });
  }

  const verifiedOwner = await findVerifiedEmailOwnerFast(member.email, member.id);
  if (verifiedOwner) {
    return Response.json(
      { error: "This email address is already linked to another verified member account. Please use another email address." },
      { status: 400 },
    );
  }

  await updateMember(session.subject, { emailVerified: true });
  await upsertVerificationSnapshot(session.subject);
  await addAuditLog({
    actorType: "member",
    actorId: session.subject,
    action: "Confirmed current email without change",
    targetProfileId: session.subject,
    metadata: { scope: "email-confirm" },
  });

  return Response.json({ message: "Email address confirmed successfully." });
}
