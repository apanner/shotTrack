import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth-api";
import { z } from "zod";

const bodySchema = z.object({
  projectId: z.string().min(1),
  text: z.string().min(1),
});

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  sequence: "sequence",
  seq: "sequence",
  shot: "code",
  code: "code",
  description: "description",
  desc: "description",
  stage: "stage",
  status: "status",
  priority: "priority",
  due: "dueOn",
  "due date": "dueOn",
  due_on: "dueOn",
  bid: "bidDays",
  bids: "bidDays",
  "bid days": "bidDays",
  assignee: "assignedUsername",
  owner: "assignedUsername",
  assigned: "assignedUsername",
};

interface ParsedRow {
  sequence?: string;
  code?: string;
  description?: string;
  stage?: string;
  status?: string;
  priority?: string;
  dueOn?: string;
  bidDays?: string;
  assignedUsername?: string;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseTsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (nonEmpty.length < 2) {
    throw new Error("Need a header row and at least one data row");
  }
  const splitLine = (line: string) => line.split("\t");
  return {
    headers: splitLine(nonEmpty[0]).map((h) => h.trim()),
    rows: nonEmpty.slice(1).map(splitLine),
  };
}

function mapStage(raw: string | undefined): "temp" | "wip" | "tech_check" | "final" {
  const s = (raw ?? "temp").trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "temp" || s === "temporary") return "temp";
  if (s === "wip" || s === "work_in_progress" || s === "work") return "wip";
  if (s === "tech_check" || s === "tech" || s === "techcheck") return "tech_check";
  if (s === "final" || s === "fin") return "final";
  return "temp";
}

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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, text } = parsed.data;

  let headers: string[];
  let rows: string[][];
  try {
    const p = parseTsv(text);
    headers = p.headers;
    rows = p.rows;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Parse error" }, { status: 400 });
  }

  const colIndex: Partial<Record<keyof ParsedRow, number>> = {};
  headers.forEach((h, i) => {
    const key = HEADER_MAP[normalizeHeader(h)];
    if (key) colIndex[key] = i;
  });

  if (colIndex.code === undefined) {
    return NextResponse.json(
      { error: "Missing required column: code (or shot)" },
      { status: 400 }
    );
  }

  const db = getDb();
  const [proj] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
  if (!proj) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const userCache = new Map<string, string>();
  async function resolveUser(username: string | undefined): Promise<string | null> {
    if (!username?.trim()) return null;
    const u = username.trim().toLowerCase();
    if (userCache.has(u)) return userCache.get(u)!;
    const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, u)).limit(1);
    if (!row) return null;
    userCache.set(u, row.id);
    return row.id;
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r];
    const get = (key: keyof ParsedRow) => {
      const idx = colIndex[key];
      if (idx === undefined) return "";
      return (cells[idx] ?? "").trim();
    };

    const code = get("code");
    if (!code) {
      skipped += 1;
      continue;
    }

    const bidRaw = get("bidDays");
    let bidDays: number | null = null;
    if (bidRaw) {
      const n = Number(bidRaw.replace(",", "."));
      if (!Number.isNaN(n)) bidDays = n;
    }

    const assignedUserId = await resolveUser(get("assignedUsername") || undefined);

    const id = crypto.randomUUID();
    const now = new Date();

    try {
      await db.insert(schema.shots).values({
        id,
        projectId,
        sequence: get("sequence") || "",
        code,
        description: get("description") || "",
        stage: mapStage(get("stage")),
        status: get("status") || "not_started",
        priority: get("priority") || "medium",
        dueOn: get("dueOn") || null,
        bidDays,
        assignedUserId,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE") || msg.includes("unique")) {
        skipped += 1;
        errors.push(`Row ${r + 2}: duplicate code ${code}`);
      } else {
        errors.push(`Row ${r + 2}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped,
    errors: errors.slice(0, 50),
  });
}
