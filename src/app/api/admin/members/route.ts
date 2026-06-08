import { PAGE_SIZE } from "@/lib/constants";
import { getMemberDirectoryData } from "@/lib/data";

function parseFilters(value: string | null) {
  return (value?.split(",").filter(Boolean) as Array<"verified" | "pending" | "shared">) ?? [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const query = searchParams.get("q") ?? "";
  const filters = parseFilters(searchParams.get("filters"));
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const sort = searchParams.get("sort") ?? "name_asc";

  const data = await getMemberDirectoryData({
    page,
    pageSize: PAGE_SIZE,
    query,
    filters,
    sort,
  });

  return Response.json({
    members: data.members,
    counts: data.counts,
    total: data.total,
    currentPage: page,
    pageSize: PAGE_SIZE,
    query,
    filters,
    view,
    sort,
  });
}
