import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function ensureDataDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createLibsqlClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN ?? "",
    });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "shottrack.db");
  ensureDataDir(dbPath);
  const fileUrl = pathToFileURL(dbPath).href;
  return createClient({ url: fileUrl });
}

export function getDb() {
  if (_db) return _db;
  const client = createLibsqlClient();
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
