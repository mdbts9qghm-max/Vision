import { requireAuth } from "@/server/auth";
import { TabBar } from "@/components/app-shell/tab-bar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Defense in depth: middleware schützt bereits, das Layout prüft erneut.
  await requireAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-6">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
