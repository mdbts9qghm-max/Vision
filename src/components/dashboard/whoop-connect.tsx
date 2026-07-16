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
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(
    flash === "connected"
      ? { text: "WHOOP verbunden.", ok: true }
      : flash === "denied"
        ? { text: "Verbindung abgebrochen.", ok: false }
        : flash === "error"
          ? { text: "Verbindung fehlgeschlagen.", ok: false }
          : flash === "unconfigured"
            ? { text: "WHOOP-Zugang nicht konfiguriert.", ok: false }
            : null,
  );

  function sync() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncWhoopNow();
      if (r.error) setMsg({ text: r.error, ok: false });
      else if (r.saved && r.saved.length > 0)
        setMsg({
          text: `Aktualisiert: ${r.saved.map((s) => SAVED_LABEL[s] ?? s).join(", ")}`,
          ok: true,
        });
      else setMsg({ text: "Keine neuen WHOOP-Daten.", ok: true });
    });
  }

  function unlink() {
    startTransition(async () => {
      await disconnectWhoop();
      setMsg(null);
    });
  }

  if (!configured && !connected) {
    return (
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
        WHOOP-Auto-Import ist noch nicht eingerichtet.
      </p>
    );
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
            msg.ok ? "text-emerald-500" : "text-destructive",
          )}
          aria-live="polite"
        >
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
