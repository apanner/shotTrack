import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth-api";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const db = getDb();
  const users = (
    await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
  ).sort((a, b) => a.username.localeCompare(b.username));

  return NextResponse.json({ users });
}

const createSchema = z.object({
  username: z.string().min(2).max(120),
  password: z.string().min(8).max(200),
  displayName: z.string().max(200).optional(),
  role: z.enum(["admin", "vendor"]),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);
  const id = crypto.randomUUID();

  const db = getDb();
  try {
    await db.insert(schema.users).values({
      id,
      username,
      passwordHash,
      displayName: parsed.data.displayName?.trim() || null,
      role: parsed.data.role,
      createdAt: new Date(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
    throw e;
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      role: schema.users.role,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  return NextResponse.json({ user });
}
