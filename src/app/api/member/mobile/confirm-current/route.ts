import { getMemberSession } from "@/lib/auth";
import { addAuditLog, findVerifiedMobileOwnerFast, getMemberByIdForAuth, setMobileLoginOwner, updateMember, upsertVerificationSnapshot } from "@/lib/data";

export async function POST() {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getMemberByIdForAuth(session.subject);
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 });
  if (!member.currentMobile) {
    return Response.json({ error: "No registered mobile number found. Please use Edit to add a mobile number." }, { status: 400 });
  }

  const verifiedOwner = await findVerifiedMobileOwnerFast(member.currentMobile, member.id);
  if (verifiedOwner) {
    return Response.json(
      { error: "This mobile number is already linked to another verified member account. Please use another mobile number." },
      { status: 400 },
    );
  }

  await updateMember(session.subject, { mobileVerified: true });
  await setMobileLoginOwner(member.currentMobile, member.id);
  await upsertVerificationSnapshot(session.subject);
  await addAuditLog({
    actorType: "member",
    actorId: session.subject,
    action: "Confirmed current mobile without change",
    targetProfileId: session.subject,
    metadata: { scope: "mobile-confirm" },
  });

  return Response.json({ message: "Mobile number confirmed successfully." });
}
