"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/auth";
import { disconnect } from "@/server/whoop/client";
import { syncWhoop } from "@/server/whoop/sync";

export type SyncState = { error?: string; saved?: string[]; date?: string | null };

/** Manueller Sync über den Button im Erholungs-Block. */
export async function syncWhoopNow(): Promise<SyncState> {
  await requireAuth();
  try {
    const result = await syncWhoop();
    revalidatePath("/dashboard");
    revalidatePath("/sleep");
    revalidatePath("/review");
    return { saved: result.saved, date: result.date };
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "WHOOP-Sync fehlgeschlagen.",
    };
  }
}

/** WHOOP-Verbindung trennen (Tokens löschen). */
export async function disconnectWhoop(): Promise<{ error?: string }> {
  await requireAuth();
  await disconnect();
  revalidatePath("/dashboard");
  return {};
}
