import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAuthFromCookies, requireAdmin } from "@/lib/auth-api";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const patchSchema = z.object({
  displayName: z.string().max(200).nullable().optional(),
  role: z.enum(["admin", "vendor"]).optional(),
  password: z.string().min(8).max(200).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

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

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.password) updates.passwordHash = await hashPassword(parsed.data.password);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ user: existing });
  }

  await db.update(schema.users).set(updates as Record<string, never>).where(eq(schema.users.id, id));

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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const session = await getAuthFromCookies();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.sub === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = getDb();
  await db.delete(schema.users).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
