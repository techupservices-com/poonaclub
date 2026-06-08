import { DOCUMENT_BUCKET, SELFIE_BUCKET } from "@/lib/constants";
import type { MemberDocument } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { getRequiredSupabaseClient, mapDocument, type DocumentRow } from "@/lib/services/shared-db";

export async function resolveMemberPhotoUrl(
  client: ReturnType<typeof getRequiredSupabaseClient>,
  profileId: string,
  photoUrl: string | null,
  documents: DocumentRow[],
) {
  if (photoUrl?.startsWith("http://") || photoUrl?.startsWith("https://")) {
    return photoUrl;
  }

  const selfie = documents.find(
    (document) => document.profile_id === profileId && document.document_type === "selfie",
  );
  const storagePath = photoUrl || selfie?.file_path;
  if (!storagePath) return undefined;

  const { data, error } = await client.storage.from(SELFIE_BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}

export async function createSignedStorageUrl(bucket: string, filePath: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(filePath, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listDocuments(profileId: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as DocumentRow[]).map(mapDocument);
}

export async function uploadMemberDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
  bytes: ArrayBuffer,
  documentGroup?: "selfie" | "aadhar" | "passport" | "legacy",
  documentPart?: "selfie" | "front" | "back" | "first_page" | "last_page" | "legacy",
) {
  const client = getRequiredSupabaseClient();
  const bucket = documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const pathGroup = documentGroup ?? (documentType === "selfie" ? "selfie" : "legacy");
  const pathPart = documentPart ?? (documentType === "selfie" ? "selfie" : "legacy");
  const filePath = `${profileId}/${pathGroup}/${pathPart}/${generateId("upload")}-${fileName.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await client.storage.from(bucket).upload(filePath, Buffer.from(bytes), {
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  if (documentType === "selfie") {
    await client.from("member_documents").delete().eq("profile_id", profileId).eq("document_type", documentType);
  } else if (documentGroup && documentPart) {
    const existingDocs = await listDocuments(profileId);
    const existing = existingDocs.find(
      (document) => document.documentGroup === documentGroup && document.documentPart === documentPart,
    );
    if (existing) {
      await client.from("member_documents").delete().eq("id", existing.id);
      await client.storage.from(bucket).remove([existing.filePath]);
    }
  }

  const { data, error } = await client
    .from("member_documents")
    .insert({
      profile_id: profileId,
      document_type: documentType,
      document_group: documentGroup ?? (documentType === "selfie" ? "selfie" : "legacy"),
      document_part: documentPart ?? (documentType === "selfie" ? "selfie" : "legacy"),
      document_number: null,
      file_name: fileName,
      file_path: filePath,
      mime_type: mimeType,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Unable to save uploaded file metadata.");

  if (documentType === "selfie") {
    await client.from("profiles").update({ photo_url: filePath, updated_at: new Date().toISOString() }).eq("id", profileId);
  }

  return mapDocument(data as DocumentRow);
}

export async function removeMemberDocument(profileId: string, documentType: "selfie" | "document") {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_documents")
    .select("id,file_path")
    .eq("profile_id", profileId)
    .eq("document_type", documentType)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const bucket = documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const [{ error: storageError }, { error: deleteError }] = await Promise.all([
    client.storage.from(bucket).remove([data.file_path]),
    client.from("member_documents").delete().eq("id", data.id),
  ]);
  if (storageError) throw storageError;
  if (deleteError) throw deleteError;

  if (documentType === "selfie") {
    const { error: profileError } = await client.from("profiles").update({ photo_url: null, updated_at: new Date().toISOString() }).eq("id", profileId);
    if (profileError) throw profileError;
  }

  return true;
}

export async function removeMemberDocumentById(profileId: string, documentId: string) {
  const client = getRequiredSupabaseClient();
  const { data, error } = await client
    .from("member_documents")
    .select("id,file_path,document_type")
    .eq("profile_id", profileId)
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const bucket = data.document_type === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
  const [{ error: storageError }, { error: deleteError }] = await Promise.all([
    client.storage.from(bucket).remove([data.file_path]),
    client.from("member_documents").delete().eq("id", data.id),
  ]);
  if (storageError) throw storageError;
  if (deleteError) throw deleteError;

  if (data.document_type === "selfie") {
    const { error: profileError } = await client.from("profiles").update({ photo_url: null, updated_at: new Date().toISOString() }).eq("id", profileId);
    if (profileError) throw profileError;
  }

  return true;
}

export async function getMemberProfilePhotoUrl(profileId: string, photoUrl?: string) {
  const client = getRequiredSupabaseClient();
  const documents = await listDocuments(profileId);
  return (
    (await resolveMemberPhotoUrl(
      client,
      profileId,
      photoUrl ?? null,
      documents.map((document) => ({
        id: document.id,
        profile_id: document.profileId,
        document_type: document.documentType,
        document_group: document.documentGroup,
        document_part: document.documentPart,
        document_number: document.documentNumber ?? null,
        file_path: document.filePath,
        file_name: document.fileName,
        mime_type: document.mimeType,
        uploaded_at: document.uploadedAt,
      })),
    )) ?? null
  );
}

export async function getMemberDocumentPreviewUrl(document: MemberDocument) {
  if (document.mimeType.startsWith("image/")) {
    const bucket = document.documentType === "selfie" ? SELFIE_BUCKET : DOCUMENT_BUCKET;
    return createSignedStorageUrl(bucket, document.filePath);
  }
  return null;
}
