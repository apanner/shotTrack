import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface SessionPayload extends JWTPayload {
  sub: string;
  username: string;
  role: "admin" | "vendor";
}

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters (use openssl rand -hex 32)");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: {
  sub: string;
  username: string;
  role: "admin" | "vendor";
}): Promise<string> {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  const username = payload.username;
  const role = payload.role;
  if (typeof sub !== "string" || typeof username !== "string" || (role !== "admin" && role !== "vendor")) {
    throw new Error("Invalid token payload");
  }
  return { sub, username, role, ...payload } as SessionPayload;
}
