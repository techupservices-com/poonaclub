import Image from "next/image";
import { getProfilePhotoPublicUrl, getSelectedProfileRows } from "@/lib/services/admin-export-service";
import type { MemberDirectoryFilterKey } from "@/lib/types";
import { formatMobile } from "@/lib/utils";

export const dynamic = "force-dynamic";

function parseFilters(value?: string) {
  return (value?.split(",").filter(Boolean) as MemberDirectoryFilterKey[]) ?? [];
}

export default async function AdminMemberCardExportPage({
  searchParams,
}: {
  searchParams: Promise<{ selectionMode?: "selected_ids" | "all_filtered"; ids?: string; q?: string; filters?: string }>;
}) {
  const params = await searchParams;
  const selectionMode = params.selectionMode === "all_filtered" ? "all_filtered" : "selected_ids";
  const selectedIds = params.ids?.split(",").filter(Boolean) ?? [];
  const profiles = await getSelectedProfileRows({
    selectionMode,
    selectedIds,
    query: params.q ?? "",
    filters: parseFilters(params.filters),
  });

  return (
    <section className="grid gap-5">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 7mm; }
          nav, header, .print-actions { display: none !important; }
          body { background: white !important; }
          .print-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
          .print-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; border-radius: 10px !important; padding: 7px !important; min-height: 64mm !important; }
          .print-photo { height: 92px !important; border-radius: 9px !important; }
          .print-body { margin-top: 6px !important; }
          .print-name { font-size: 11.5px !important; line-height: 1.15 !important; }
          .print-meta { margin-top: 3px !important; font-size: 9px !important; line-height: 1.25 !important; }
          .print-details { margin-top: 5px !important; gap: 1px !important; font-size: 8.2px !important; line-height: 1.22 !important; }
          .print-address { line-height: 1.28 !important; }
        }
      `}</style>
      <div className="print-actions soft-card rounded-[24px] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#3c589e]">Card export</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Printable member cards</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Showing {profiles.length} member{profiles.length === 1 ? "" : "s"}. Use browser print or save as PDF.</p>
      </div>

      <div className="print-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => {
          const photoUrl = getProfilePhotoPublicUrl(profile);
          return (
            <article key={profile.id} className="print-card soft-card rounded-[24px] p-5">
              <div className="print-photo relative flex h-56 w-full items-center justify-center overflow-hidden rounded-[22px] border border-[var(--border)] bg-[#eef2fb] text-[#3c589e]">
                {photoUrl ? (
                  <Image src={photoUrl} alt={`${profile.full_name} profile`} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-contain" />
                ) : (
                  <span className="text-sm font-semibold">No photo</span>
                )}
              </div>
              <div className="print-body mt-4">
                <h2 className="print-name text-xl font-semibold text-[var(--foreground)]">{profile.full_name}</h2>
                <p className="print-meta mt-2 text-sm text-[var(--muted)]">{profile.membership_id} · {profile.member_type ?? ""}</p>
                <div className="print-details mt-4 space-y-2 text-sm">
                  <p className="text-[var(--muted)]">{profile.email ?? ""}</p>
                  <p className="font-medium text-[var(--foreground)]">{formatMobile(profile.current_mobile ?? "")}</p>
                  <p className="print-address leading-6 text-[var(--muted)]">{[profile.address1, profile.address2, profile.address3, profile.city, profile.pincode].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
