import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { formatLongDate, todayISO } from "@/domain/dates";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Heute — Vision" };

export default function DashboardPage() {
  const today = todayISO();

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Heute</h1>
          <p className="text-sm text-muted-foreground">
            {formatLongDate(today)}
          </p>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Abmelden"
          >
            <LogOut />
          </Button>
        </form>
      </header>

      <EmptyState
        title="Noch keine Gewohnheiten für heute"
        description="Sobald du Gewohnheiten angelegt hast, siehst du hier alle fälligen Check-offs, deinen Fokus des Tages und den Wochenfortschritt."
      />
    </div>
  );
}
