import { getMemberSession } from "@/lib/auth";
import { addAuditLog, uploadMemberDocument } from "@/lib/data";
import { clearAdminRejectionSteps } from "@/lib/services/admin-review-service";
import { upsertVerificationSnapshot } from "@/lib/services/summary-service";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const selfie = formData.get("selfie") as File | null;
  if (!selfie) {
    return Response.json({ error: "Please choose a selfie file to upload." }, { status: 400 });
  }

  if (selfie) {
    await uploadMemberDocument(
      session.subject,
      "selfie",
      selfie.name || "selfie-upload",
      selfie.type || "image/jpeg",
      await selfie.arrayBuffer(),
      "selfie",
      "selfie",
    );
    await clearAdminRejectionSteps(session.subject, ["selfie"]);
    await upsertVerificationSnapshot(session.subject);
  }
  await addAuditLog({ actorType: "member", actorId: session.subject, action: "Uploaded verification files", targetProfileId: session.subject, metadata: { scope: "uploads" } });
  return Response.json({ message: "Selfie uploaded and linked to your member profile." });
}
