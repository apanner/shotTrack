import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getAuthFromCookies } from "@/lib/auth-api";

export async function GET() {
  const session = await getAuthFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.sub))
    .limit(1);
  const user = rows[0];

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
