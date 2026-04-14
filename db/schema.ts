import { sqliteTable, text, real, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Admin: full visibility. Vendor: only assigned shots; no bid columns. */
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    role: text("role", { enum: ["admin", "vendor"] })
      .notNull()
      .default("vendor"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  }
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  }
);

/** Pipeline stages: temp -> wip -> tech_check -> final (order is business logic in UI). */
export const shotStages = ["temp", "wip", "tech_check", "final"] as const;
export type ShotStage = (typeof shotStages)[number];

export const shots = sqliteTable(
  "shots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sequence: text("sequence").notNull().default(""),
    code: text("code").notNull(),
    description: text("description").notNull().default(""),
    stage: text("stage").notNull().default("temp"),
    status: text("status").notNull().default("not_started"),
    priority: text("priority").notNull().default("medium"),
    dueOn: text("due_on"),
    /** Bid / estimate (days). Hidden from vendors in API responses. */
    bidDays: real("bid_days"),
    assignedUserId: text("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    shotsProjectIdx: index("shots_project_idx").on(t.projectId),
    shotsAssignedIdx: index("shots_assigned_idx").on(t.assignedUserId),
    shotsProjectCodeUidx: uniqueIndex("shots_project_code_uidx").on(t.projectId, t.code),
  })
);
