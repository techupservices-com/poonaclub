import { ExistingUploadedFiles } from "@/components/member/existing-uploaded-files";
import { UploadForm } from "@/components/member/upload-form";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberSession } from "@/lib/auth";
import {
  getMemberById,
  getMemberDocumentPreviewUrl,
  getMemberProfilePhotoUrl,
  listDocuments,
} from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function UploadsPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  const documents = member ? await listDocuments(member.id) : [];
  const selfiePreviewUrl = member
    ? await getMemberProfilePhotoUrl(member.id, member.photoUrl)
    : null;
  const sortedDocuments = [...documents].sort((left, right) => {
    const order = [
      "selfie:selfie",
      "aadhar:front",
      "aadhar:back",
      "passport:first_page",
      "passport:last_page",
      "legacy:legacy",
    ];
    return order.indexOf(`${left.documentGroup}:${left.documentPart}`) - order.indexOf(`${right.documentGroup}:${right.documentPart}`);
  });

  const documentItems = await Promise.all(
    sortedDocuments.map(async (document) => ({
      id: document.id,
      documentType: document.documentType,
      documentGroup: document.documentGroup,
      documentPart: document.documentPart,
      fileName: document.fileName,
      uploadedAt: formatDate(document.uploadedAt),
      previewUrl:
        document.documentType === "selfie"
          ? selfiePreviewUrl
          : await getMemberDocumentPreviewUrl(document),
      mimeType: document.mimeType,
    })),
  );

  return (
    <section className="grid gap-4">
      <div className="soft-card rounded-[28px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Uploads step</p>
            <h2 className="mt-2 text-2xl font-semibold">Upload selfie and supporting document</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This step is complete only when both files are uploaded successfully to your member record.</p>
          </div>
          <StatusChip label={member?.verification.selfieUploaded && member?.verification.documentUploaded ? "Completed" : "Pending"} tone={member?.verification.selfieUploaded && member?.verification.documentUploaded ? "success" : "warning"} />
        </div>
      </div>

      {documents.length ? (
        <div className="soft-card rounded-[28px] p-6">
          <h3 className="text-xl font-semibold">Files already on record</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            These files are already linked to your membership. Upload again only if you want to replace them.
          </p>
          <ExistingUploadedFiles items={documentItems} />
        </div>
      ) : null}

      <div className="soft-card rounded-[28px] p-6">
        <UploadForm />
      </div>
    </section>
  );
}
