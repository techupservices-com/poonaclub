import { getRecentAuditPreviewData } from "@/lib/data";

export async function GET() {
  const data = await getRecentAuditPreviewData(4);
  return Response.json(data);
}
