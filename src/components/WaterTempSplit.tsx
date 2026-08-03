import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { LabelWithInfo } from "@/components/InfoTip";
import { needsIceWater, type MixerType } from "@/lib/dough-pro";
import { Droplets } from "lucide-react";

interface Props {
  ambient: number;
  onAmbient: (v: number) => void;
  flourTemp: number;
  onFlourTemp: (v: number) => void;
  mixer: MixerType;
  onMixer: (m: MixerType) => void;
  /** Pre-ferment water temperature (undefined for the direct method). */
  bigaTemp?: number;
  refreshTemp: number;
  autolysePenalty?: number;
}

/**
 * Two distinct water temperatures:
 *  - pre-ferment (target dough 19–20°C, low friction)
 *  - refreshment / full mix (target dough 23–24°C, mixer friction)
 */
export function WaterTempSplit({
  ambient, onAmbient, flourTemp, onFlourTemp, mixer, onMixer,
  bigaTemp, refreshTemp, autolysePenalty = 0,
}: Props) {
  const { t } = useI18n();

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Droplets className="size-4 text-[color:var(--fridge)]" />
        <h3 className="font-display font-semibold text-sm">
          <LabelWithInfo label={t("water_temp_split_title")} info={t("info_water_temp")} />
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t("water_temp_split_desc")}</p>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t("water_pro_room")} value={ambient} onChange={onAmbient} />
        <Field label={t("water_pro_flour")} value={flourTemp} onChange={onFlourTemp} />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("water_pro_mixer")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {(["hand", "spiral"] as MixerType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMixer(m)}
              className={`h-9 rounded-md border text-xs font-medium transition-colors ${
                mixer === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {m === "hand" ? t("water_pro_hand") : t("water_pro_spiral")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {bigaTemp !== undefined && (
          <TempRow
            label={t("water_temp_biga_label")}
            hint={t("water_temp_biga_target")}
            value={bigaTemp}
            iceLabel={t("water_pro_ice")}
          />
        )}
        <TempRow
          label={t("water_temp_refresh_label")}
          hint={t("water_temp_refresh_target")}
          value={refreshTemp}
          iceLabel={t("water_pro_ice")}
        />
      </div>

      {autolysePenalty > 0 && (
        <p className="text-[11px] text-muted-foreground">{t("autolyse_temp_penalty")}</p>
      )}
    </Card>
  );
}

function TempRow({ label, hint, value, iceLabel }: { label: string; hint: string; value: number; iceLabel: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--fridge)]/40 bg-[color:var(--fridge)]/5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="tabular text-2xl font-bold" style={{ color: "var(--fridge)" }}>
          {value.toFixed(1)}<span className="text-sm ml-0.5">°C</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
      {needsIceWater(value) && (
        <p className="text-[11px] mt-2 rounded-md border border-warning/40 bg-warning/10 p-2">{iceLabel}</p>
      )}
    </div>
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
