import { MemberDirectory } from "@/components/admin/member-directory";
import { PAGE_SIZE } from "@/lib/constants";
import { getMemberDirectoryData } from "@/lib/data";

export const dynamic = "force-dynamic";

function parseFilters(value?: string) {
  return (value?.split(",").filter(Boolean) as Array<"verified" | "pending" | "shared">) ?? [];
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; filters?: string; view?: "grid" | "list"; sort?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = params.q ?? "";
  const filters = parseFilters(params.filters);
  const view = params.view === "list" ? "list" : "grid";
  const sort = params.sort ?? "name_asc";
  const data = await getMemberDirectoryData({ page, pageSize: PAGE_SIZE, query, filters, sort });

  return (
    <MemberDirectory
      members={data.members}
      counts={data.counts}
      total={data.total}
      currentPage={page}
      pageSize={PAGE_SIZE}
      query={query}
      filters={filters}
      view={view}
      sort={sort}
    />
  );
}
