import { getMemberPreviewData } from "@/lib/data";

export async function GET() {
  const data = await getMemberPreviewData(4);
  return Response.json(data);
}
