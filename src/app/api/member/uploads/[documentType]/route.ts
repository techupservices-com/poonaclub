import { addAuditLog, removeMemberDocument, removeMemberDocumentById } from "@/lib/data";
import { getMemberSession } from "@/lib/auth";

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/member/uploads/[documentType]">,
) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { documentType } = await context.params;
  if (documentType !== "selfie" && documentType !== "document") {
    return Response.json({ error: "Invalid document type." }, { status: 400 });
  }

  const url = new URL(request.url);
  const documentId = url.searchParams.get("documentId");

  if (documentId) {
    await removeMemberDocumentById(session.subject, documentId);
  } else {
    await removeMemberDocument(session.subject, documentType);
  }
  await addAuditLog({
    actorType: "member",
    actorId: session.subject,
    action: "Removed uploaded verification file",
    targetProfileId: session.subject,
    metadata: { scope: "uploads", documentType },
  });

  return Response.json({ message: "Uploaded file removed from your member profile." });
}
