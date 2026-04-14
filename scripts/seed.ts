/**
 * Create initial admin user. Run after `npm run db:push`.
 * Usage (PowerShell):
 *   $env:JWT_SECRET="(32+ chars)"
 *   $env:ADMIN_USERNAME="apanner"
 *   $env:ADMIN_PASSWORD="your-secure-password"
 *   npm run db:seed
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { hashPassword } from "../lib/password";

async function main() {
  const username = (process.env.ADMIN_USERNAME || "apanner").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 6) {
    console.error("Set ADMIN_PASSWORD (min 6 characters) in the environment.");
    process.exit(1);
  }
  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt.length < 32) {
    console.error("Set JWT_SECRET to a random string of at least 32 characters.");
    process.exit(1);
  }

  const db = getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  if (existing) {
    console.log("Admin user already exists:", username);
    return;
  }

  const id = crypto.randomUUID();
  await db.insert(schema.users).values({
    id,
    username,
    passwordHash: await hashPassword(password),
    displayName: process.env.ADMIN_DISPLAY_NAME?.trim() || "Admin",
    role: "admin",
    createdAt: new Date(),
  });

  console.log("Created admin user:", username);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
