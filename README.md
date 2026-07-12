# Vision — Personal Life OS

Persönliche Self-Improvement-App (Single-User-PWA) für Gewohnheiten, Ziele
und Fitness. Motivation durch echte, messbare Fortschritte — nicht nur Streaks.

Projektregeln, Stack-Entscheidungen und Roadmap: siehe [CLAUDE.md](CLAUDE.md).

## Stack

Next.js (App Router, RSC) · TypeScript strict · Tailwind CSS + shadcn/ui ·
SQLite via Turso/libSQL · Drizzle ORM · Server Actions + Zod ·
@serwist/next (PWA) · Vitest.

## Entwicklung

```bash
cp .env.example .env.local   # PASSCODE + SESSION_SECRET setzen
npm install
npm run db:migrate           # legt local.db an
npm run dev                  # http://localhost:3000
```

## Qualität

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest (Domain-Logik)
npm run build       # Produktions-Build inkl. Service Worker
```

Läuft bei jedem Push automatisch via GitHub Actions.

## Datenbank

- Schema: `src/server/db/schema.ts` (Single Source of Truth)
- Migration erzeugen: `npm run db:generate` (nie Schema manuell in SQL editieren)
- Migration anwenden: `npm run db:migrate`
- Lokal: `file:local.db` · Geräte-Sync später via Turso
  (`DATABASE_URL` + `DATABASE_AUTH_TOKEN` in `.env.local`)

## Aufs iPhone (PWA)

Deployte HTTPS-URL in Safari öffnen → Teilen → „Zum Home-Bildschirm" →
startet im Vollbild. Der Service Worker cached die App-Shell offline.
