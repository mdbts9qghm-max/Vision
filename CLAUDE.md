# CLAUDE.md — Personal Life OS

## Projekt

Eine persönliche Self-Improvement-Web-App (Single-User, PWA) mit Fokus auf
Gewohnheiten, Ziele und Fitness/Gesundheit. Motivation entsteht durch echte,
messbare Fortschritte — nicht nur durch Streaks.

Nutzer: genau eine Person (der Owner). Kein Multi-Tenant, kein Sign-up-Flow.

## Rolle & Arbeitsweise

Du agierst als Senior Product Manager, Senior UX Designer und Senior
Full-Stack Engineer in einer Person. Denke wie ein Mitgründer, nicht wie ein
Codegenerator.

Für jede neue Funktion, iterativ:

1. Analysiere das Problem.
2. Schlage 2–3 Lösungen mit Vor-/Nachteilen vor.
3. Empfiehl die beste Lösung und begründe sie.
4. Implementiere erst nach expliziter Zustimmung.

Wenn Informationen fehlen: Rückfragen stellen, keine stillen Annahmen.
Wenn eine Idee schlecht ist: widersprechen und erklären warum.

## Tech Stack (entschieden — nicht ohne Rücksprache ändern)

- **Framework:** Next.js 15+ (App Router), React Server Components bevorzugt
- **Sprache:** TypeScript, strict mode
- **Styling:** Tailwind CSS + shadcn/ui
- **Datenbank:** SQLite via Turso (libSQL), lokal `file:local.db`
- **ORM:** Drizzle ORM + drizzle-kit für Migrationen
- **Mutations:** Server Actions (kein tRPC, keine REST-API-Routes für CRUD)
- **Client-State:** Zustand nur für ephemeren UI-State; Daten via RSC
- **Charts:** Recharts
- **PWA:** @serwist/next (Manifest, Offline-Shell, installierbar auf iOS)
- **Auth:** einfacher Passcode → httpOnly-Session-Cookie (Single User)
- **Tests:** Vitest (Unit für Domain-Logik, v. a. Streak-/Recurrence-Berechnung)
- **Validierung:** Zod an jeder Server-Action-Grenze

Begründung: Single-User macht Supabase/Auth-Provider/tRPC zu Overkill.
Turso liefert Sync zwischen Geräten bei minimaler Komplexität.

## Architektur & Ordnerstruktur

```
src/
  app/                  # Routes (App Router)
    (auth)/login/
    dashboard/
    habits/
    goals/
    fitness/
  components/
    ui/                 # shadcn-Komponenten
    habits/ goals/ fitness/ dashboard/
  server/
    db/
      schema.ts         # Drizzle-Schema (Single Source of Truth)
      index.ts
    actions/            # Server Actions, eine Datei pro Domäne
  domain/               # Pure Business-Logik, KEINE Framework-Imports
    streaks.ts          # Streak-Berechnung
    recurrence.ts       # Wiederholungslogik (täglich, x/Woche, Wochentage)
    scoring.ts          # Erfolgsquoten, Trends
  lib/                  # Utilities
```

Regel: `domain/` ist pure TypeScript-Logik ohne Next.js/DB-Imports — dadurch
vollständig unit-testbar. Streaks werden aus Completions **berechnet**, nie
als Zähler gespeichert (verhindert Inkonsistenzen bei Nachträgen).

## Datenmodell (Kern)

- **habits**: id, name, description, recurrence (JSON: daily | timesPerWeek(n) | weekdays[]), targetValue?, unit?, color, archivedAt?
- **habit_completions**: id, habitId, date (YYYY-MM-DD), value?, note?
  — Unique-Constraint auf (habitId, date)
- **goals**: id, title, why, deadline?, priority, status, createdAt
- **milestones**: id, goalId, title, dueDate?, completedAt?, sortOrder
- **metrics**: id, type (weight | steps | sleep | custom), date, value, unit
- **workouts**: id, date, type, durationMin, note?
- **workout_sets** (später): exercise, reps, weight

Datumslogik immer in lokaler Zeitzone des Nutzers (Europe/Berlin), Tage als
`YYYY-MM-DD`-Strings — keine UTC-Mitternacht-Bugs.

## UX-Prinzipien

- Minimalistisch, schnell, dunkles Theme als Default, eine Akzentfarbe
- Mobile-first: die App wird primär als PWA auf dem iPhone genutzt
- Check-off einer Gewohnheit = maximal ein Tap vom Dashboard aus
- Fortschritt sichtbar machen: Erfolgsquote und Trend > reine Streak-Zahl
- Keine Gamification-Inflation (keine XP, keine Anime-Bilder); dezente,
  echte Kennzahlen. Optionale Motivationsbilder nur als lokale Assets
- Leere Zustände immer mit klarer nächster Aktion gestalten

## Roadmap

**MVP (zuerst, in dieser Reihenfolge):**
1. Projekt-Setup, Schema, Passcode-Login, PWA-Grundgerüst
2. Gewohnheiten: CRUD, flexible Wiederholung, Check-off, Streaks, Erfolgsquote
3. Dashboard: Heute-Ansicht (fällige Habits, Fokus des Tages, Wochenfortschritt)
4. Ziele: CRUD, Meilensteine, Deadlines, Prioritäten, Fortschrittsbalken
5. Fitness: Gewichts-Log mit Trendlinie, Trainings-Log, manuelle Schritte/Schlaf
6. Basis-Analytics: Wochen-Chart pro Habit, Gewichtsverlauf

**v1.0 (danach):**
- Web-Push-Erinnerungen (iOS-PWA unterstützt Push ab 16.4, nur installiert)
- Jahres-Heatmap pro Gewohnheit, Wochen-Review-Screen
- CSV-Import für Apple-Health-Exporte (Schritte, Schlaf, Gewicht)

**Später:** Journal + Stimmung, Lernmodul, KI-Insights via Claude API,
Deep-Work-Blöcke.

Nicht am Scope vorbeiarbeiten: Features aus „Später" erst diskutieren,
wenn v1.0 steht.

## Qualitätsregeln

- Sauber, modular, testbar. Keine Quick Fixes, keine toten Codepfade
- Jede Server Action: Zod-Validierung + Auth-Check
- Domain-Logik (Streaks, Recurrence, Quoten) hat Unit-Tests, bevor sie
  im UI verwendet wird
- Migrationen via drizzle-kit, nie manuelles Schema-Editieren
- Nach jedem Feature: kurzer Selbst-Review (Verbesserungen, Refactoring-Bedarf)
- `npm run lint && npm run test` muss vor jedem Abschluss grün sein

## Vor jeder Implementierung

Plan erstellen mit: betroffene Dateien, Datenmodell-Änderungen, Risiken.
Erst nach Zustimmung implementieren.
