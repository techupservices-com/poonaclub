import { AdminAuditHistory } from "@/components/admin/admin-audit-history";
import { PAGE_SIZE } from "@/lib/constants";
import { getAuditHistoryData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const data = await getAuditHistoryData({ page, pageSize: PAGE_SIZE });

  return (
    <AdminAuditHistory
      items={data.items}
      total={data.total}
      currentPage={page}
      pageSize={PAGE_SIZE}
    />
  );
}
