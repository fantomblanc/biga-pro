import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { LabelWithInfo } from "@/components/InfoTip";
import {
  KNEAD_MODES,
  KNEAD_MODE_LABEL_KEY,
  REFRESH_FRICTION_RANGE,
  refreshWaterTemp,
  directWaterTemp,
  type KneadMode,
} from "@/lib/dough-thermo";
import { Snowflake } from "lucide-react";

interface Props {
  /** Mature pre-ferment temperature; undefined for the direct method. */
  bigaTemp?: number;
  onBigaTemp?: (v: number) => void;
  /** Flour temperature — only used by the direct method. */
  flourTemp: number;
  onFlourTemp: (v: number) => void;
  ambientTemp: number;
  onAmbientTemp: (v: number) => void;
  /** Equipment used for THIS stage only — fully independent of the Biga mix. */
  mode: KneadMode;
  onMode: (m: KneadMode) => void;
  friction: number;
  onFriction: (v: number) => void;
  autolysePenalty?: number;
  bare?: boolean;
}

/** Module B — refreshment / full-mix water temperature (target dough 23°C). */
export function RefreshWaterModule({
  bigaTemp, onBigaTemp, flourTemp, onFlourTemp,
  ambientTemp, onAmbientTemp, mode, onMode, friction, onFriction,
  autolysePenalty = 0, bare,
}: Props) {
  const { t } = useI18n();
  const [fMin, fMax] = REFRESH_FRICTION_RANGE[mode];

  const res = bigaTemp !== undefined
    ? refreshWaterTemp({ bigaTemp, ambientTemp, friction, autolysePenalty })
    : directWaterTemp({ ambientTemp, flourTemp, friction });

  const body = (
    <div className="space-y-3">
      {!bare && (
        <div className="flex items-center gap-2">
          <Snowflake className="size-4 text-[color:var(--fridge)]" />
          <h3 className="font-display font-semibold text-sm">
            <LabelWithInfo label={t("thermo_refresh_title")} info={t("info_water_temp")} />
          </h3>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t("thermo_refresh_desc")}</p>

      <div className="grid grid-cols-2 gap-2">
        {bigaTemp !== undefined && onBigaTemp && (
          <NumF label={t("thermo_biga_real_temp")} value={bigaTemp} onChange={onBigaTemp} />
        )}
        {bigaTemp === undefined && (
          <NumF label={t("thermo_refresh_flour_temp")} value={flourTemp} onChange={onFlourTemp} />
        )}
        <NumF label={t("thermo_ambient_temp")} value={ambientTemp} onChange={onAmbientTemp} />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("thermo_equipment_refresh")}
        </Label>
        <p className="text-[10px] text-muted-foreground mt-1">{t("thermo_equipment_independent")}</p>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {KNEAD_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              className={`min-h-11 rounded-md border px-2 py-1.5 text-[11px] font-medium leading-tight transition-colors ${
                mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t(KNEAD_MODE_LABEL_KEY[m])}
              <span className="block text-[9px] opacity-70">
                +{REFRESH_FRICTION_RANGE[m][0]}–{REFRESH_FRICTION_RANGE[m][1]}°C
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("thermo_friction")}</Label>
          <span className="tabular text-sm font-semibold text-primary">+{friction.toFixed(1)}°C</span>
        </div>
        <Slider
          value={[Math.min(fMax, Math.max(fMin, friction))]}
          min={fMin}
          max={fMax}
          step={0.5}
          onValueChange={(v) => onFriction(v[0])}
        />
      </div>

      <div className="rounded-lg border border-[color:var(--fridge)]/40 bg-[color:var(--fridge)]/5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("thermo_refresh_result")}</div>
          <div className="tabular text-2xl font-bold" style={{ color: "var(--fridge)" }}>
            {res.waterTemp.toFixed(1)}<span className="text-sm ml-0.5">°C</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{t("thermo_refresh_target")}</p>
        <p className="text-[10px] text-muted-foreground tabular mt-1">{res.formula}</p>
        {res.needsIce && (
          <p className="text-[11px] mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 font-medium">
            {t("thermo_ice_4")}
          </p>
        )}
        {res.clamped && <p className="text-[11px] mt-2 text-muted-foreground">{t("thermo_clamped")}</p>}
      </div>
    </div>
  );

  return bare ? body : <Card className="p-4">{body}</Card>;
}

function NumF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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
