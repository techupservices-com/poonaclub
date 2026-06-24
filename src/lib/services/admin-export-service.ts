import { resolveAdminSelection } from "@/lib/services/admin-selection-service";
import { getRequiredSupabaseClient, type ProfileRow } from "@/lib/services/shared-db";
import type { AdminSelectionMode, MemberDirectoryFilterKey } from "@/lib/types";

const DB_CHUNK_SIZE = 500;

export async function getSelectedProfileRows(input: {
  selectionMode: AdminSelectionMode;
  selectedIds?: string[];
  query?: string;
  filters?: MemberDirectoryFilterKey[];
}) {
  const profileIds = await resolveAdminSelection(input);
  if (!profileIds.length) return [] as ProfileRow[];

  const client = getRequiredSupabaseClient();
  const rows: ProfileRow[] = [];
  for (let index = 0; index < profileIds.length; index += DB_CHUNK_SIZE) {
    const chunk = profileIds.slice(index, index + DB_CHUNK_SIZE);
    const { data, error } = await client.from("profiles").select("*").in("id", chunk);
    if (error) throw error;
    rows.push(...((data ?? []) as ProfileRow[]));
  }

  const order = new Map(profileIds.map((id, index) => [id, index]));
  return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
}

export function getProfilePhotoPublicUrl(profile: ProfileRow) {
  if (!profile.photo_url) return "";
  if (profile.photo_url.startsWith("http")) return profile.photo_url;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return baseUrl ? `${baseUrl}/storage/v1/object/public/member-selfies/${profile.photo_url}` : profile.photo_url;
}
