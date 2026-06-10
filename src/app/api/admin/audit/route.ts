import { PAGE_SIZE } from "@/lib/constants";
import { getAuditHistoryDataWithQuery } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const query = searchParams.get("q") ?? "";
  const data = await getAuditHistoryDataWithQuery({ page, pageSize: PAGE_SIZE, query });

  return Response.json({
    items: data.items,
    total: data.total,
    currentPage: page,
    pageSize: PAGE_SIZE,
  });
}
