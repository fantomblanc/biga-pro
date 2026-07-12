import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { key: "preset_neapolitan", seconds: 90 },
  { key: "preset_contemporary", seconds: 120 },
  { key: "preset_roman", seconds: 180 },
];

export function CookTimer() {
  const { t } = useI18n();
  const [total, setTotal] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          playAlarm();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function playAlarm() {
    try {
      const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AudioCtx();
      const beep = (freq: number, when: number, dur = 0.25) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.value = 0.25;
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + when);
        osc.stop(ctx.currentTime + when + dur);
      };
      beep(1200, 0);
      beep(1200, 0.35);
      beep(1600, 0.7, 0.5);
    } catch { /* noop */ }
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 600]);
  }

  function setPreset(sec: number) {
    setTotal(sec);
    setRemaining(sec);
    setRunning(false);
  }

  function reset() {
    setRemaining(total);
    setRunning(false);
  }

  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const danger = remaining <= 15 && remaining > 0;
  const done = remaining === 0;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <Card className="p-5 space-y-4 border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="size-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">{t("cook_timer")}</h3>
        </div>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.seconds)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md border transition-colors",
                total === p.seconds
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.seconds}s
            </button>
          ))}
        </div>
      </div>

      <div className="relative aspect-square max-w-[260px] mx-auto">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r="88" fill="none" stroke="var(--color-muted)" strokeWidth="10" />
          <circle
            cx="100" cy="100" r="88" fill="none"
            stroke={done ? "var(--success)" : danger ? "var(--destructive)" : "var(--primary)"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 0.5s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn(
            "tabular text-6xl sm:text-7xl font-bold",
            done ? "text-[color:var(--success)] animate-pulse"
              : danger ? "text-destructive" : "text-foreground",
          )}>
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">
            {done ? "🔔 DONE" : `${total}s preset`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          onClick={() => (done ? (reset(), setRunning(true)) : setRunning((r) => !r))}
          className="h-14 text-base font-semibold"
        >
          {running ? <><Pause className="size-5 mr-2" />{t("pause")}</> : <><Play className="size-5 mr-2" />{t("start")}</>}
        </Button>
        <Button size="lg" variant="secondary" onClick={reset} className="h-14 text-base font-semibold">
          <RotateCcw className="size-5 mr-2" />{t("reset")}
        </Button>
      </div>
      <audio ref={audioRef} />
    </Card>
  );
}
