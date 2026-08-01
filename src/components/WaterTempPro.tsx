import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { LabelWithInfo } from "@/components/InfoTip";
import { calcProWaterTemp, needsIceWater, type MixerType } from "@/lib/dough-pro";
import { Droplets } from "lucide-react";

interface Props {
  defaultRoom?: number;
  defaultFlour?: number;
  defaultTarget?: number;
  autolysePenalty?: number;
  /** Reports the computed water temperature so it can be stored on the recipe. */
  onResult?: (temp: number, opts: { target: number; room: number; flour: number; mixer: MixerType }) => void;
}

/**
 * Professional water temperature:
 * T°water = (target dough × 3) − (room + flour + mixer friction) − autolyse penalty.
 */
export function WaterTempPro({
  defaultRoom = 22,
  defaultFlour = 20,
  defaultTarget = 23,
  autolysePenalty = 0,
  onResult,
}: Props) {
  const { t } = useI18n();
  const [target, setTarget] = useState(defaultTarget);
  const [room, setRoom] = useState(defaultRoom);
  const [flour, setFlour] = useState(defaultFlour);
  const [mixer, setMixer] = useState<MixerType>("hand");

  const temp = calcProWaterTemp({ targetDough: target, room, flour, mixer, autolysePenalty });
  const ice = needsIceWater(temp);

  if (onResult) onResult(temp, { target, room, flour, mixer });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-[color:var(--fridge)]" />
        <h3 className="font-display font-semibold text-sm">
          <LabelWithInfo label={t("water_pro_title")} info={t("info_water_temp")} />
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t("water_pro_desc")}</p>

      <div className="grid grid-cols-3 gap-2">
        <Field label={t("water_pro_target")} value={target} onChange={setTarget} />
        <Field label={t("water_pro_room")} value={room} onChange={setRoom} />
        <Field label={t("water_pro_flour")} value={flour} onChange={setFlour} />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("water_pro_mixer")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {(["hand", "spiral"] as MixerType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMixer(m)}
              className={`h-9 rounded-md border text-xs font-medium transition-colors ${
                mixer === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {m === "hand" ? t("water_pro_hand") : t("water_pro_spiral")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[color:var(--fridge)]/40 bg-[color:var(--fridge)]/5 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("water_pro_result")}</div>
        <div className="tabular text-3xl font-bold" style={{ color: "var(--fridge)" }}>
          {temp.toFixed(1)}<span className="text-base ml-1">°C</span>
        </div>
        {autolysePenalty > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">{t("autolyse_temp_penalty")}</p>
        )}
        {ice && (
          <p className="text-xs mt-2 rounded-md border border-warning/40 bg-warning/10 p-2">{t("water_pro_ice")}</p>
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
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tabular mt-1 h-9"
      />
    </div>
  );
}
