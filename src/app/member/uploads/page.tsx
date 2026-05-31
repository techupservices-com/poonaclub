import Image from "next/image";
import { UploadForm } from "@/components/member/upload-form";
import { StatusChip } from "@/components/shared/status-chip";
import { getMemberSession } from "@/lib/auth";
import { getMemberById, getMemberProfilePhotoUrl, listDocuments } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function UploadsPage() {
  const session = await getMemberSession();
  const member = session ? await getMemberById(session.subject) : null;
  const documents = member ? await listDocuments(member.id) : [];
  const selfiePreviewUrl = member
    ? await getMemberProfilePhotoUrl(member.id, member.photoUrl)
    : null;

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
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {documents.map((document) => (
              <div key={document.id} className="rounded-[22px] border border-[var(--border)] bg-white p-4">
                {document.documentType === "selfie" && selfiePreviewUrl ? (
                  <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-[18px] bg-[#eef2fb]">
                    <Image
                      src={selfiePreviewUrl}
                      alt="Uploaded selfie on record"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold capitalize">{document.documentType}</p>
                  <StatusChip label="On record" tone="success" />
                </div>
                <p className="mt-2 text-sm text-[var(--foreground)]">{document.fileName}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Uploaded {formatDate(document.uploadedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="soft-card rounded-[28px] p-6">
        <UploadForm />
      </div>
    </section>
  );
}
