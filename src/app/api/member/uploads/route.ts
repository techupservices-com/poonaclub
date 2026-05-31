import { getMemberSession } from "@/lib/auth";
import { addAuditLog, uploadMemberDocument } from "@/lib/data";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const selfie = formData.get("selfie") as File | null;
  const document = formData.get("document") as File | null;

  if (!selfie || !document) {
    return Response.json({ error: "Both selfie and supporting document are required." }, { status: 400 });
  }

  await uploadMemberDocument(
    session.subject,
    "selfie",
    selfie.name || "selfie-upload",
    selfie.type || "image/jpeg",
    await selfie.arrayBuffer(),
  );
  await uploadMemberDocument(
    session.subject,
    "document",
    document.name || "supporting-document",
    document.type || "application/octet-stream",
    await document.arrayBuffer(),
  );
  await addAuditLog({ actorType: "member", actorId: session.subject, action: "Uploaded verification files", targetProfileId: session.subject, metadata: { scope: "uploads" } });
  return Response.json({ message: "Files uploaded and linked to your member profile." });
}
