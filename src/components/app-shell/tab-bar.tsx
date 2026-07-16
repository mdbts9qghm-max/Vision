"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  LayoutDashboard,
  Moon,
  Repeat,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Heute", icon: LayoutDashboard },
  { href: "/habits", label: "Habits", icon: Repeat },
  { href: "/coach", label: "Coach", icon: CalendarRange },
  { href: "/sleep", label: "Schlaf", icon: Moon },
  { href: "/review", label: "Rückblick", icon: Sparkles },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-12 flex-col items-center gap-1 whitespace-nowrap px-1.5 py-2 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
