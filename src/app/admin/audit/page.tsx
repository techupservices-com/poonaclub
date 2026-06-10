import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { PAGE_SIZE } from "@/lib/constants";
import { getAuditHistoryDataWithQuery } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = params.q ?? "";
  const data = await getAuditHistoryDataWithQuery({ page, pageSize: PAGE_SIZE, query });

  return (
    <AdminAuditHistory
      key={`${page}-${query}-${data.total}-${data.items.map((item) => item.id).join(",")}`}
      items={data.items}
      total={data.total}
      currentPage={page}
      pageSize={PAGE_SIZE}
      query={query}
    />
  );
}
