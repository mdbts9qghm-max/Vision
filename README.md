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

## Deployment (Vercel)

1. <https://vercel.com/new> → **Import Git Repository** → `mdbts9qghm-max/Vision`
   (ggf. GitHub-Konto verbinden und Vercel Zugriff auf das Repo geben).
2. Framework-Preset **Next.js** wird automatisch erkannt — nichts ändern.
3. Unter **Environment Variables** vor dem ersten Deploy setzen:
   - `PASSCODE` — dein Login-Passcode
   - `SESSION_SECRET` — langer Zufallswert, z. B. aus `openssl rand -hex 32`
   (ohne `SESSION_SECRET` beantwortet die App jede Anfrage mit einem Fehler.)
4. **Deploy** → HTTPS-URL (z. B. `https://vision-….vercel.app`).
   Jeder Push auf `main` deployt danach automatisch.

Noch ohne Datenbank-Anbindung nutzbar; sobald Habits (Roadmap-Schritt 2)
live gehen, zusätzlich `DATABASE_URL` + `DATABASE_AUTH_TOKEN` einer
Turso-Datenbank setzen — die lokale `file:local.db` funktioniert auf
Vercels Serverless-Dateisystem nicht.

## Aufs iPhone (PWA)

Deployte HTTPS-URL in Safari öffnen → Teilen → „Zum Home-Bildschirm" →
startet im Vollbild. Der Service Worker cached die App-Shell offline.
