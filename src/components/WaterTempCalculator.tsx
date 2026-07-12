import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { calculateWaterTemp } from "@/lib/dough-engine";
import { Droplet, Snowflake } from "lucide-react";

export function WaterTempCalculator({
  defaultRoom = 22,
  defaultFlour = 20,
}: {
  defaultRoom?: number;
  defaultFlour?: number;
}) {
  const { t } = useI18n();
  const [room, setRoom] = useState(defaultRoom);
  const [flour, setFlour] = useState(defaultFlour);
  const [friction, setFriction] = useState(10);
  const [target, setTarget] = useState(0);

  useEffect(() => {
    setTarget(calculateWaterTemp(room, flour, friction));
  }, [room, flour, friction]);

  const cold = target < 6;

  return (
    <Card className="p-4 sm:p-5 space-y-4 border-border/60">
      <div className="flex items-center gap-2">
        <Droplet className="size-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">{t("water_calc")}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t("room_temp")} value={room} onChange={setRoom} />
        <Field label={t("flour_temp")} value={flour} onChange={setFlour} />
        <Field label={t("friction")} value={friction} onChange={setFriction} />
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("target_water_temp")}
          </div>
          <div className="tabular text-4xl font-bold text-primary mt-1">
            {target.toFixed(1)}
            <span className="text-lg text-muted-foreground ml-1">°C</span>
          </div>
        </div>
        {cold && (
          <div className="text-right max-w-[45%]">
            <Snowflake className="size-5 text-[color:var(--fridge)] ml-auto mb-1" />
            <div className="text-[11px] text-[color:var(--fridge)] leading-tight">{t("ice_tip")}</div>
          </div>
        )}
      </div>
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
