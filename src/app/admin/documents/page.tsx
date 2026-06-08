import { AdminDocumentsQueue } from "@/components/admin/admin-documents-queue";
import { PAGE_SIZE } from "@/lib/constants";
import { getSelfieQueueData } from "@/lib/data";

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const data = await getSelfieQueueData({ page, pageSize: PAGE_SIZE });

  return <AdminDocumentsQueue items={data.items} total={data.total} currentPage={page} />;
}
