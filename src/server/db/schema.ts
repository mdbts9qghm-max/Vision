import {
  index,
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

export type HabitCategory =
  | "sleep"
  | "nutrition"
  | "movement"
  | "recovery"
  | "mind";

export type HabitReminder =
  | { type: "time"; time: string } // "HH:MM"
  | { type: "shiftRelative"; event: "beforeStart" | "afterEnd"; minutes: number };

export const habits = sqliteTable("habits", {
  id: id(),
  name: text("name").notNull(),
  // Auslöser / Implementation Intention (Habit-Spec 2.1) — Pflichtfeld.
  cue: text("cue").notNull(),
  // Habit Stacking (2.2): bestehende Routine oder Schicht-Ereignis.
  stackedOn: text("stacked_on"),
  description: text("description"),
  recurrence: text("recurrence", { mode: "json" })
    .$type<Recurrence>()
    .notNull(),
  // Zwei-Level-Ziel (2.4): Minimum (nicht verhandelbar) + Ziel.
  minValue: real("min_value"),
  targetValue: real("target_value"),
  unit: text("unit"),
  category: text("category").$type<HabitCategory>(),
  reminder: text("reminder", { mode: "json" }).$type<HabitReminder>(),
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
    // Skip ≠ Fail (2.5): verpasst = kein Eintrag (wird berechnet).
    // "partial": Wert geloggt, Minimum noch nicht erreicht.
    status: text("status", { enum: ["done", "skipped", "partial"] })
      .notNull()
      .default("done"),
    skipReason: text("skip_reason"),
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

/**
 * Täglicher mentaler Check-in (ein Tap je Facette) + kurzes Journal.
 * Skalen 1–5. Werte optional, damit auch ein Teil-Check-in gilt.
 */
export const checkins = sqliteTable("checkins", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD, Europe/Berlin
  mood: integer("mood"), // 1 = sehr schlecht … 5 = sehr gut
  energy: integer("energy"), // 1 = leer … 5 = voll
  stress: integer("stress"), // 1 = entspannt … 5 = überlastet
  note: text("note"), // freies Journal (optional)
  createdAt: createdAt(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/**
 * Wöchentlicher Rückblick (ein Eintrag je ISO-Woche, Montag als Schlüssel):
 * geführte Reflexion. Die Kennzahlen der Woche werden live berechnet.
 */
export const weeklyReviews = sqliteTable("weekly_reviews", {
  id: id(),
  weekStart: text("week_start").notNull().unique(), // Montag, YYYY-MM-DD
  wentWell: text("went_well"),
  toImprove: text("to_improve"),
  focusNext: text("focus_next"),
  createdAt: createdAt(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
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
    type: text("type", {
      enum: ["weight", "steps", "sleep", "recovery", "hrv", "rhr", "custom"],
    }).notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("metrics_type_date_unique").on(table.type, table.date),
  ],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: id(),
    date: text("date").notNull(), // YYYY-MM-DD
    type: text("type").notNull(),
    durationMin: integer("duration_min").notNull(),
    distanceKm: real("distance_km"), // für Läufe: zählt aufs Wochenziel
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [index("workouts_date_idx").on(table.date)],
);

// ---- Trainings-Coach (Schichtarbeit + Ultra-Aufbau) ----

export const shifts = sqliteTable("shifts", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  type: text("type", {
    enum: ["day", "night", "sleep", "free", "v", "sick", "vacation"],
  }).notNull(),
  createdAt: createdAt(),
});

export const plannedSessions = sqliteTable("planned_sessions", {
  id: id(),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  kind: text("kind", {
    enum: ["longrun", "run", "easy", "gym", "mobility", "rest"],
  }).notNull(),
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

/**
 * WHOOP-OAuth-Verbindung (genau eine Zeile, id = "singleton").
 * Client-ID/Secret liegen in den Env-Variablen, hier nur die per-User-Tokens.
 */
export const whoopConnection = sqliteTable("whoop_connection", {
  id: text("id").primaryKey().default("singleton"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: text("expires_at").notNull(), // ISO, Ablauf des Access-Tokens
  scope: text("scope"),
  lastSyncAt: text("last_sync_at"), // ISO des letzten erfolgreichen Syncs
  tokenMeta: text("token_meta"), // Diagnose: redigierte Meta der Token-Antwort
  createdAt: createdAt(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
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
