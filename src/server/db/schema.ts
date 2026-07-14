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
  distanceKm: real("distance_km"), // für Läufe: zählt aufs Wochenziel
  note: text("note"),
  createdAt: createdAt(),
});

// ---- Trainings-Coach (Schichtarbeit + Ultra-Aufbau) ----

export const shifts = sqliteTable("shifts", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  type: text("type", { enum: ["day", "night", "sleep", "free", "v"] })
    .notNull(),
  createdAt: createdAt(),
});

export const plannedSessions = sqliteTable("planned_sessions", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  kind: text("kind", { enum: ["longrun", "run", "easy", "gym", "rest"] })
    .notNull(),
  targetKm: real("target_km"),
  targetMin: integer("target_min"), // Startblock: Dauer statt Distanz
  optional: integer("optional", { mode: "boolean" }).notNull().default(false),
  reason: text("reason").notNull(), // Begründung aus den Planungsregeln
  createdAt: createdAt(),
});

/** Täglicher Erholungs-Check (ein Tap): Grundlage der Autoregulation. */
export const readinessChecks = sqliteTable("readiness_checks", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  score: text("score", { enum: ["good", "ok", "low"] }).notNull(),
  createdAt: createdAt(),
});

/** Genau eine Zeile (id = "singleton") — Parameter des Coaches. */
export const coachSettings = sqliteTable("coach_settings", {
  id: text("id").primaryKey().default("singleton"),
  weeklyKmBase: real("weekly_km_base").notNull().default(15),
  progressionPct: real("progression_pct").notNull().default(7),
  deloadEveryWeeks: integer("deload_every_weeks").notNull().default(4),
  weeklyGymTarget: integer("weekly_gym_target").notNull().default(3),
  startWeek: text("start_week").notNull(), // Montag der ersten Coach-Woche
});
