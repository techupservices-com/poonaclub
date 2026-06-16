import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, MEMBER_SESSION_COOKIE, MEMBER_SESSION_HOURS } from "@/lib/constants";

interface SessionPayload {
  subject: string;
  role: "member" | "admin";
  expiresAt: number;
  loginIdentifierType?: "mobile" | "email";
}

const secret = process.env.SESSION_SECRET ?? "poona-club-dev-session-secret";

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${signature}`;
}

function decode(token: string | undefined | null) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(subject: string, role: "member" | "admin", options?: { loginIdentifierType?: "mobile" | "email" }) {
  return encode({
    subject,
    role,
    expiresAt: Date.now() + MEMBER_SESSION_HOURS * 60 * 60 * 1000,
    ...(role === "member" && options?.loginIdentifierType ? { loginIdentifierType: options.loginIdentifierType } : {}),
  });
}

export async function getMemberSession() {
  const store = await cookies();
  return decode(store.get(MEMBER_SESSION_COOKIE)?.value);
}

export async function getAdminSession() {
  const store = await cookies();
  return decode(store.get(ADMIN_SESSION_COOKIE)?.value);
}
