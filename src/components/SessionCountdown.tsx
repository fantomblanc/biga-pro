import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { updatesCopy } from "@/lib/updates-copy";
import type { TimelineStep } from "@/lib/dough-engine";
export function SessionCountdown({ steps }: { steps: TimelineStep[] }) {
  const { t, lang } = useI18n();
  const c = updatesCopy(lang);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (now === null) return null;
  const next = [...steps].sort((a, b) => Date.parse(a.timeISO) - Date.parse(b.timeISO)).find((s) => Date.parse(s.timeISO) > now);
  if (!next) return <p className="text-sm text-muted-foreground">{c.done}</p>;
  const seconds = Math.ceil((Date.parse(next.timeISO) - now) / 1000);
  const label = next.id === "preheat" ? c.preheat : next.labelKey === "session_poolish_start" ? c.poolish : t(next.labelKey);
  return <div className="border-l-2 border-primary pl-4 py-2" role="status">
    <p className="text-xs text-muted-foreground flex gap-2 items-center"><Clock className="size-4" />{c.next}</p>
    <p className="font-semibold mt-1">{label}</p>
    <p className="text-3xl tabular-nums font-bold text-primary mt-1">{Math.floor(seconds / 86400) > 0 ? `${Math.floor(seconds / 86400)}d ` : ""}{String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>
    <p className="text-xs text-muted-foreground mt-1">{new Date(next.timeISO).toLocaleString(lang, { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
  </div>;
}