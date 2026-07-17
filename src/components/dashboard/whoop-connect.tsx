"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Watch } from "lucide-react";
import { disconnectWhoop, syncWhoopNow } from "@/server/actions/whoop";
import { cn } from "@/lib/utils";

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const diffMin = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `vor ${h} h`;
  return `vor ${Math.round(h / 24)} d`;
}

const SAVED_LABEL: Record<string, string> = {
  recovery: "Recovery",
  hrv: "HRV",
  rhr: "Ruhepuls",
  sleep: "Schlaf",
};

export function WhoopConnect({
  configured,
  connected,
  lastSyncAt,
  flash,
}: {
  configured: boolean;
  connected: boolean;
  lastSyncAt?: string;
  flash?: string;
  /** Technischer Grund (nur intern/Debug) — wird bewusst nicht angezeigt. */
  detail?: string;
}) {
  const [pending, startTransition] = useTransition();
  // Ein Sync/Connect-Fehler bekommt eine ruhige, hilfreiche Zeile statt einer
  // roten Roh-Fehlermeldung. `detail` wird bewusst nicht mehr angezeigt.
  const SYNC_FAILED = "Sync gerade nicht möglich — Werte unten manuell eintragen.";
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "warn" } | null>(
    flash === "connected"
      ? { text: "WHOOP verbunden.", tone: "ok" }
      : flash === "denied"
        ? { text: "Verbindung abgebrochen.", tone: "warn" }
        : flash === "error"
          ? { text: "Verbindung nicht möglich — du kannst manuell eintragen.", tone: "warn" }
          : flash === "unconfigured"
            ? { text: "WHOOP-Zugang nicht konfiguriert.", tone: "warn" }
            : null,
  );

  function sync() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncWhoopNow();
      if (r.error) setMsg({ text: SYNC_FAILED, tone: "warn" });
      else if (r.saved && r.saved.length > 0)
        setMsg({
          text: `Aktualisiert: ${r.saved.map((s) => SAVED_LABEL[s] ?? s).join(", ")}`,
          tone: "ok",
        });
      else setMsg({ text: "Keine neuen WHOOP-Daten.", tone: "ok" });
    });
  }

  function unlink() {
    startTransition(async () => {
      await disconnectWhoop();
      setMsg(null);
    });
  }

  // Solange WHOOP nicht eingerichtet/verbunden ist, gar nichts anzeigen —
  // der Erholungs-Block bleibt sauber, die manuelle Eingabe steht direkt darunter.
  if (!configured && !connected) {
    return null;
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {connected ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Watch className="size-3.5 text-primary" aria-hidden />
            WHOOP verbunden
            {relativeTime(lastSyncAt) ? (
              <span className="text-xs">· Sync {relativeTime(lastSyncAt)}</span>
            ) : null}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={sync}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-full border border-primary/60 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              <RefreshCw
                className={cn("size-3.5", pending && "animate-spin")}
                aria-hidden
              />
              Synchronisieren
            </button>
            <button
              type="button"
              onClick={unlink}
              disabled={pending}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              Trennen
            </button>
          </div>
        </div>
      ) : (
        <a
          href="/api/whoop/connect"
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Watch className="size-4" aria-hidden />
          Mit WHOOP verbinden
        </a>
      )}

      {msg ? (
        <p
          className={cn(
            "text-xs",
            msg.tone === "ok" ? "text-emerald-500" : "text-amber-500",
          )}
          aria-live="polite"
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
