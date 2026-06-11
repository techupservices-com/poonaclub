import { Webhook } from "svix";
import { updateBroadcastEmailRecipientEvent } from "@/lib/services/broadcast-email-service";

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Webhook secret is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing webhook signature headers." }, { status: 401 });
  }

  try {
    const webhook = new Webhook(webhookSecret);
    webhook.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as {
    type?: string;
    data?: { email_id?: string };
  };

  const emailId = payload.data?.email_id;
  if (!payload.type || !emailId) {
    return Response.json({ ok: true });
  }

  await updateBroadcastEmailRecipientEvent(emailId, payload.type);
  return Response.json({ ok: true });
}
