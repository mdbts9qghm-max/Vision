import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { Recurrence } from "@/domain/recurrence";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString());

export const habits = sqliteTable("habits", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  recurrence: text("recurrence", { mode: "json" })
    .$type<Recurrence>()
    .notNull(),
  targetValue: real("target_value"),
  unit: text("unit"),
  color: text("color").notNull().default("primary"),
  createdAt: createdAt(),
  archivedAt: text("archived_at"),
});

export const habitCompletions = sqliteTable(
  "habit_completions",
  {
    id: id(),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD, Europe/Berlin
    value: real("value"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("habit_completions_habit_date_unique").on(
      table.habitId,
      table.date,
    ),
  ],
);

export const dayFocus = sqliteTable("day_focus", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD, Europe/Berlin
  text: text("text").notNull(),
  createdAt: createdAt(),
});

export const goals = sqliteTable("goals", {
  id: id(),
  title: text("title").notNull(),
  why: text("why"),
  deadline: text("deadline"), // YYYY-MM-DD
  priority: text("priority", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["active", "completed", "archived"] })
    .notNull()
    .default("active"),
  createdAt: createdAt(),
});

export const milestones = sqliteTable("milestones", {
  id: id(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueDate: text("due_date"), // YYYY-MM-DD
  completedAt: text("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const metrics = sqliteTable(
  "metrics",
  {
    id: id(),
    type: text("type", { enum: ["weight", "steps", "sleep", "custom"] })
      .notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("metrics_type_date_unique").on(table.type, table.date),
  ],
);

export const workouts = sqliteTable("workouts", {
  id: id(),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type").notNull(),
  durationMin: integer("duration_min").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});
