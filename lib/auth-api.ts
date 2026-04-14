import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./jwt";

const COOKIE = "shottrack_auth";

export async function getAuthFromCookies(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const s = await getAuthFromCookies();
  if (!s) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireAuth();
  if (s.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return s;
}
