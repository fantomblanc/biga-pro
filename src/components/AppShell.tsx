import { Link, useRouterState } from "@tanstack/react-router";
import { LanguageSelector } from "./LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { Flame, Home, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/", label: t("nav_dashboard"), Icon: Home },
    { to: "/new", label: t("nav_new"), Icon: Plus },
    { to: "/settings", label: t("nav_settings"), Icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur no-print">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="grid place-items-center size-8 rounded-lg ember-gradient shadow-lg shadow-primary/30">
              <Flame className="size-4 text-primary-foreground" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-bold tracking-tight">CarpiBiga Pro</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] hidden sm:block">
                {t("tagline")}
              </div>
            </div>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur no-print">
        <div className="mx-auto max-w-3xl grid grid-cols-3">
          {navItems.map(({ to, label, Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_var(--primary)]")} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
