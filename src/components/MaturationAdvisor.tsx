import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { maturationRange, maturationVerdict } from "@/lib/flours";
import { Snowflake, Thermometer, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  flourW: number;
}

/**
 * Hybrid maturation advisor: user splits fermentation between fridge and
 * room temperature; total is analyzed against the flour W window.
 */
export function MaturationAdvisor({ flourW }: Props) {
  const { t } = useI18n();
  const [fridge, setFridge] = useState(24);
  const [room, setRoom] = useState(4);

  const total = Math.max(0, fridge) + Math.max(0, room);
  const [lo, hi] = useMemo(() => maturationRange(flourW), [flourW]);
  const verdict = maturationVerdict(total, flourW);

  const color =
    verdict === "optimal" ? "var(--success)"
    : verdict === "under" ? "var(--fridge)"
    : "var(--warning, oklch(0.75 0.15 60))";

  const msgKey =
    verdict === "optimal" ? "maturation_optimal"
    : verdict === "under" ? "maturation_under"
    : "maturation_over";

  const Icon = verdict === "optimal" ? CheckCircle2 : AlertTriangle;

  return (
    <Card className="p-4 space-y-3 border-[color:var(--fridge)]/30">
      <div className="flex items-center gap-2">
        <Snowflake className="size-4 text-[color:var(--fridge)]" />
        <h3 className="font-display font-semibold text-sm">{t("maturation_title")}</h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("maturation_desc")}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <HField
          icon={<Snowflake className="size-3.5 text-[color:var(--fridge)]" />}
          label={t("maturation_fridge")}
          value={fridge}
          onChange={setFridge}
        />
        <HField
          icon={<Thermometer className="size-3.5 text-[color:var(--final)]" />}
          label={t("maturation_room")}
          value={room}
          onChange={setRoom}
        />
      </div>

      <div className="rounded-lg border p-3" style={{ borderColor: `color-mix(in oklab, ${color} 45%, transparent)`, backgroundColor: `color-mix(in oklab, ${color} 8%, transparent)` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("maturation_total")}</div>
            <div className="tabular text-2xl font-bold mt-0.5" style={{ color }}>
              {total}<span className="text-sm text-muted-foreground ml-1">{t("maturation_hours")}</span>
            </div>
          </div>
          <Icon className="size-6 shrink-0" style={{ color }} />
        </div>
        <div className="mt-2 flex items-start gap-2">
          <p className="text-xs leading-relaxed" style={{ color }}>{t(msgKey)}</p>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground tabular">
          {t("maturation_range").replace("{w}", String(flourW)).replace("{min}", String(lo)).replace("{max}", String(hi))}
        </p>
      </div>
    </Card>
  );
}

function HField({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </Label>
      <div className="relative mt-1">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tabular pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">h</span>
      </div>
    </div>
  );
}
