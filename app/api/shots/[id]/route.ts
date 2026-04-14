import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/auth-api";
import { mapShotForRole } from "@/lib/shots-map";
import { z } from "zod";

const patchSchema = z.object({
  sequence: z.string().max(80).optional(),
  code: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  stage: z.enum(["temp", "wip", "tech_check", "final"]).optional(),
  status: z.string().max(80).optional(),
  priority: z.string().max(40).optional(),
  dueOn: z.string().max(32).nullable().optional(),
  bidDays: z.number().nullable().optional(),
  assignedUsername: z.string().min(1).max(120).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  let session;
  try {
    session = await requireAuth();
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
  const [existing] = await db.select().from(schema.shots).where(eq(schema.shots.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.role === "vendor") {
    if (existing.assignedUserId !== session.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      parsed.data.bidDays !== undefined ||
      parsed.data.assignedUsername !== undefined
    ) {
      return NextResponse.json({ error: "Cannot change bids or assignee" }, { status: 403 });
    }
  }

  const d = parsed.data;
  const patch: Partial<typeof schema.shots.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (d.sequence !== undefined) patch.sequence = d.sequence;
  if (d.code !== undefined) patch.code = d.code.trim();
  if (d.description !== undefined) patch.description = d.description;
  if (d.stage !== undefined) patch.stage = d.stage;
  if (d.status !== undefined) patch.status = d.status;
  if (d.priority !== undefined) patch.priority = d.priority;
  if (d.dueOn !== undefined) patch.dueOn = d.dueOn;

  if (session.role === "admin") {
    if (d.bidDays !== undefined) patch.bidDays = d.bidDays;
    if (d.assignedUsername !== undefined) {
      if (d.assignedUsername === null) {
        patch.assignedUserId = null;
      } else {
        const u = d.assignedUsername.trim().toLowerCase();
        const [userRow] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.username, u))
          .limit(1);
        if (!userRow) {
          return NextResponse.json({ error: `User not found: ${u}` }, { status: 400 });
        }
        patch.assignedUserId = userRow.id;
      }
    }
  }

  await db.update(schema.shots).set(patch).where(eq(schema.shots.id, id));

  const [row] = await db.select().from(schema.shots).where(eq(schema.shots.id, id)).limit(1);
  return NextResponse.json({ shot: mapShotForRole(row!, session) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  let session;
  try {
    session = await requireAuth();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  await db.delete(schema.shots).where(eq(schema.shots.id, id));
  return NextResponse.json({ ok: true });
}
