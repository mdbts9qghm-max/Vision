import { requireAuth } from "@/server/auth";
import { TabBar } from "@/components/app-shell/tab-bar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Defense in depth: middleware schützt bereits, das Layout prüft erneut.
  await requireAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Safe-Areas: oben Notch/Statusleiste, unten Home-Indicator + TabBar. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.5rem))]">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
