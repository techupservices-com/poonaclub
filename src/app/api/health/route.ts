export async function GET() {
  return Response.json({
    ok: true,
    service: "poonaclub",
    timestamp: new Date().toISOString(),
  });
}
