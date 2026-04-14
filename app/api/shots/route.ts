import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/auth-api";
import { mapShotsForRole } from "@/lib/shots-map";
import { z } from "zod";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const db = getDb();

  const q = db
    .select({
      id: schema.shots.id,
      projectId: schema.shots.projectId,
      sequence: schema.shots.sequence,
      code: schema.shots.code,
      description: schema.shots.description,
      stage: schema.shots.stage,
      status: schema.shots.status,
      priority: schema.shots.priority,
      dueOn: schema.shots.dueOn,
      bidDays: schema.shots.bidDays,
      assignedUserId: schema.shots.assignedUserId,
      createdAt: schema.shots.createdAt,
      updatedAt: schema.shots.updatedAt,
      assigneeUsername: schema.users.username,
      assigneeDisplay: schema.users.displayName,
    })
    .from(schema.shots)
    .leftJoin(schema.users, eq(schema.shots.assignedUserId, schema.users.id));

  const where =
    session.role === "admin"
      ? eq(schema.shots.projectId, projectId)
      : and(eq(schema.shots.projectId, projectId), eq(schema.shots.assignedUserId, session.sub));

  const rows = await q.where(where);

  const mapped = mapShotsForRole(rows, session);
  return NextResponse.json({ shots: mapped });
}

const createSchema = z.object({
  projectId: z.string().min(1),
  sequence: z.string().max(80).optional().default(""),
  code: z.string().min(1).max(200),
  description: z.string().max(4000).optional().default(""),
  stage: z.enum(["temp", "wip", "tech_check", "final"]).optional(),
  status: z.string().max(80).optional(),
  priority: z.string().max(40).optional(),
  dueOn: z.string().max(32).optional().nullable(),
  bidDays: z.number().nullable().optional(),
  assignedUsername: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can create shots" }, { status: 403 });
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

  const db = getDb();
  let assignedUserId: string | null = null;
  if (parsed.data.assignedUsername) {
    const u = parsed.data.assignedUsername.trim().toLowerCase();
    const [userRow] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, u))
      .limit(1);
    if (!userRow) {
      return NextResponse.json({ error: `User not found: ${u}` }, { status: 400 });
    }
    assignedUserId = userRow.id;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const stage = parsed.data.stage ?? "temp";

  await db.insert(schema.shots).values({
    id,
    projectId: parsed.data.projectId,
    sequence: parsed.data.sequence ?? "",
    code: parsed.data.code.trim(),
    description: parsed.data.description ?? "",
    stage,
    status: parsed.data.status ?? "not_started",
    priority: parsed.data.priority ?? "medium",
    dueOn: parsed.data.dueOn ?? null,
    bidDays: parsed.data.bidDays ?? null,
    assignedUserId,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(schema.shots).where(eq(schema.shots.id, id)).limit(1);
  return NextResponse.json({ shot: mapShotsForRole([row], session)[0] });
}
