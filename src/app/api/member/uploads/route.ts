import { getMemberSession } from "@/lib/auth";
import { addAuditLog, uploadMemberDocument } from "@/lib/data";

export async function POST(request: Request) {
  const session = await getMemberSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const selfie = formData.get("selfie") as File | null;
  const documentKind = String(formData.get("documentKind") ?? "");
  const aadharFront = formData.get("aadharFront") as File | null;
  const aadharBack = formData.get("aadharBack") as File | null;
  const passportFirstPage = formData.get("passportFirstPage") as File | null;
  const passportLastPage = formData.get("passportLastPage") as File | null;

  const hasAnyUpload = Boolean(
    selfie || aadharFront || aadharBack || passportFirstPage || passportLastPage,
  );

  if (!hasAnyUpload) {
    return Response.json({ error: "Please choose at least one file to upload." }, { status: 400 });
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
  }

  const uploads: Array<Promise<unknown>> = [];
  if (documentKind === "aadhar") {
    if (aadharFront) {
      uploads.push(
        uploadMemberDocument(
          session.subject,
          "document",
          aadharFront.name || "aadhar-front",
          aadharFront.type || "image/jpeg",
          await aadharFront.arrayBuffer(),
          "aadhar",
          "front",
        ),
      );
    }
    if (aadharBack) {
      uploads.push(
        uploadMemberDocument(
          session.subject,
          "document",
          aadharBack.name || "aadhar-back",
          aadharBack.type || "image/jpeg",
          await aadharBack.arrayBuffer(),
          "aadhar",
          "back",
        ),
      );
    }
  }

  if (documentKind === "passport") {
    if (passportFirstPage) {
      uploads.push(
        uploadMemberDocument(
          session.subject,
          "document",
          passportFirstPage.name || "passport-first-page",
          passportFirstPage.type || "image/jpeg",
          await passportFirstPage.arrayBuffer(),
          "passport",
          "first_page",
        ),
      );
    }
    if (passportLastPage) {
      uploads.push(
        uploadMemberDocument(
          session.subject,
          "document",
          passportLastPage.name || "passport-last-page",
          passportLastPage.type || "image/jpeg",
          await passportLastPage.arrayBuffer(),
          "passport",
          "last_page",
        ),
      );
    }
  }

  await Promise.all(uploads);
  await addAuditLog({ actorType: "member", actorId: session.subject, action: "Uploaded verification files", targetProfileId: session.subject, metadata: { scope: "uploads" } });
  return Response.json({ message: "Files uploaded and linked to your member profile." });
}
