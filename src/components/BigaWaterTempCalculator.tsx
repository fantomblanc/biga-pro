import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { calculateBigaWaterTemp } from "@/lib/dough-engine";
import { Droplet, Flame, Snowflake } from "lucide-react";

/**
 * Biga-specific water temperature calculator.
 * Target Biga after mixing: 18–20°C (absolute max 23°C).
 * Formula: Water T° = 55 − (Ambient T° + Flour T°)
 */
export function BigaWaterTempCalculator({
  defaultAmbient = 22,
  defaultFlour = 20,
}: {
  defaultAmbient?: number;
  defaultFlour?: number;
}) {
  const { t } = useI18n();
  const [ambient, setAmbient] = useState(defaultAmbient);
  const [flour, setFlour] = useState(defaultFlour);
  const [target, setTarget] = useState(0);

  useEffect(() => {
    setTarget(calculateBigaWaterTemp(ambient, flour));
  }, [ambient, flour]);

  const tooCold = target < 6;
  const tooHot = ambient > 25;

  return (
    <Card className="p-4 sm:p-5 space-y-4 border-[color:var(--cellar)]/40">
      <div className="flex items-center gap-2">
        <Droplet className="size-4 text-[color:var(--cellar)]" />
        <h3 className="font-display font-semibold text-sm">{t("biga_water_calc")}</h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("biga_water_calc_desc")}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("biga_water_ambient")} value={ambient} onChange={setAmbient} />
        <Field label={t("biga_water_flour")} value={flour} onChange={setFlour} />
      </div>

      <div className="rounded-lg border border-[color:var(--cellar)]/30 bg-[color:var(--cellar)]/5 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("biga_water_suggested")}
          </div>
          <div className="tabular text-4xl font-bold mt-1" style={{ color: "var(--cellar)" }}>
            {target.toFixed(1)}
            <span className="text-lg text-muted-foreground ml-1">°C</span>
          </div>
        </div>
        {tooCold && !tooHot && (
          <Snowflake className="size-6 text-[color:var(--fridge)] shrink-0" />
        )}
        {tooHot && (
          <Flame className="size-6 text-warning shrink-0" />
        )}
      </div>

      {tooHot && (
        <div className="flex gap-2 items-start rounded-lg border border-warning/40 bg-warning/5 p-3">
          <Flame className="size-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning-foreground/90 leading-relaxed">
            {t("biga_water_hot_warning")}
          </p>
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        step="0.5"
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular mt-1"
      />
    </div>
  );
}
