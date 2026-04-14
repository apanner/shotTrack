import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAuthFromCookies, requireAdmin } from "@/lib/auth-api";
import { slugify } from "@/lib/slug";
import { z } from "zod";

export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const projects = (await db.select().from(schema.projects)).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).optional(),
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

  const name = parsed.data.name.trim();
  const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(name);

  const db = getDb();
  const id = crypto.randomUUID();
  try {
    await db.insert(schema.projects).values({
      id,
      name,
      slug,
      createdAt: new Date(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Insert failed";
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "Project slug already exists" }, { status: 409 });
    }
    throw e;
  }

  const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  return NextResponse.json({ project: row });
}
