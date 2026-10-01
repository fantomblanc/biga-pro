import { Link, useRouterState } from "@tanstack/react-router";
import { LanguageSelector } from "./LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { Flame, Home, Plus, Settings, BookOpen, HeartHandshake, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useAppSettings } from "@/lib/app-settings";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const appSettings = useAppSettings();

  const navItems = [
    { to: "/", label: t("nav_dashboard"), Icon: Home },
    { to: "/new", label: t("nav_new"), Icon: Plus },
    { to: "/journal", label: t("journal_history"), Icon: BookOpen },
    { to: "/support", label: "Soutenir", Icon: HeartHandshake },
    { to: "/settings", label: t("nav_settings"), Icon: Settings },
  ];
  const currentTitle = navItems.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)))?.label;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl no-print">
        <div className="mx-auto max-w-3xl px-4 h-12 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid place-items-center size-7 rounded-lg bg-primary">
              <Flame className="size-4 text-primary-foreground" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">CarpiBiga Pro</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {user ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 text-[15px] text-primary active:opacity-50"
                title={user.email ?? ""}
              >
                <LogOut className="size-5" />
              </button>
            ) : (
              <Link to="/auth" className="flex items-center gap-1 text-[15px] text-primary font-medium active:opacity-50">
                <LogIn className="size-5" />
                {t("auth_sign_in")}
              </Link>
            )}
          </div>
        </div>
      </header>
      {appSettings.banner_active && appSettings.banner_message && (
        <div className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground no-print">{appSettings.banner_message}</div>
      )}

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 pb-28 pt-2">
        {currentTitle && (
          <h1 className="text-3xl font-bold tracking-tight mt-2 mb-4 no-print">{currentTitle}</h1>
        )}
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-card/80 backdrop-blur-xl no-print pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-3xl grid grid-cols-5">
          {navItems.map(({ to, label, Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] transition-colors active:opacity-60",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
