import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TimelineStep } from "@/lib/dough-engine";
import { Refrigerator, Home, Sun, Flame } from "lucide-react";

const ZONE_META: Record<TimelineStep["zone"], { color: string; Icon: typeof Home; labelKey: string }> = {
  cellar: { color: "var(--cellar)", Icon: Home, labelKey: "zone_cellar" },
  fridge: { color: "var(--fridge)", Icon: Refrigerator, labelKey: "zone_fridge" },
  final:  { color: "var(--final)",  Icon: Sun,        labelKey: "zone_final"  },
  bake:   { color: "var(--bake)",   Icon: Flame,      labelKey: "step_bake"   },
};

function formatDelta(t: (k: string) => string, ms: number): string {
  const abs = Math.abs(ms);
  const past = ms < 0;
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}${t("hours")}`);
  parts.push(`${m}${t("minutes")}`);
  const rel = parts.join(" ");
  if (abs < 60_000) return t("step_now");
  return past ? `${t("step_ago")} ${rel}` : `${t("step_in")} ${rel}`;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <ol className="relative space-y-3">
      {steps.map((step, i) => {
        const time = new Date(step.timeISO).getTime();
        const delta = time - now;
        const isPast = delta < -60_000;
        const nextTime = steps[i + 1] ? new Date(steps[i + 1].timeISO).getTime() : Infinity;
        const isActive = now >= time && now < nextTime;
        const meta = ZONE_META[step.zone];

        return (
          <li key={step.id}>
            <div
              className={cn(
                "flex gap-3 items-start rounded-xl border p-3 transition-all",
                isActive ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                  : isPast ? "border-border/40 opacity-60"
                  : "border-border/60 bg-card",
              )}
            >
              <div
                className="mt-0.5 size-9 rounded-lg grid place-items-center shrink-0"
                style={{ backgroundColor: `color-mix(in oklab, ${meta.color} 18%, transparent)`, color: meta.color }}
              >
                <meta.Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium text-sm truncate">{t(step.labelKey)}</div>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      • {t("active")}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {t(meta.labelKey)}
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-1.5">
                  <div className="tabular text-[13px] font-medium">
                    {new Date(step.timeISO).toLocaleString(undefined, {
                      weekday: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                  <div className={cn(
                    "text-[11px] tabular",
                    isPast ? "text-muted-foreground/60" : isActive ? "text-primary" : "text-muted-foreground",
                  )}>
                    {formatDelta(t, delta)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
