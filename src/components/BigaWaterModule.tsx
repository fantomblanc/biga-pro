import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { LabelWithInfo } from "@/components/InfoTip";
import {
  KNEAD_MODES,
  KNEAD_MODE_LABEL_KEY,
  SHORT_MIX_HEAT,
  bigaWaterTemp,
  type KneadMode,
} from "@/lib/dough-thermo";
import { Droplets } from "lucide-react";

interface Props {
  storageTemp: number;
  onStorageTemp: (v: number) => void;
  flourTemp: number;
  onFlourTemp: (v: number) => void;
  mode: KneadMode;
  onMode: (m: KneadMode) => void;
  bare?: boolean;
}

/** Module A — water temperature for the Biga / pre-ferment (target 18–20°C). */
export function BigaWaterModule({
  storageTemp, onStorageTemp, flourTemp, onFlourTemp, mode, onMode, bare,
}: Props) {
  const { t } = useI18n();
  const res = bigaWaterTemp({ storageTemp, flourTemp, mode });

  const body = (
    <div className="space-y-3">
      {!bare && (
        <div className="flex items-center gap-2">
          <Droplets className="size-4 text-[color:var(--fridge)]" />
          <h3 className="font-display font-semibold text-sm">
            <LabelWithInfo label={t("thermo_biga_title")} info={t("info_water_temp")} />
          </h3>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t("thermo_biga_desc")}</p>

      <div className="grid grid-cols-2 gap-2">
        <NumF label={t("thermo_storage_temp")} value={storageTemp} onChange={onStorageTemp} />
        <NumF label={t("thermo_flour_temp")} value={flourTemp} onChange={onFlourTemp} />
      </div>

      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("thermo_mix_mode")}</Label>
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
              <span className="block text-[9px] opacity-70">+{SHORT_MIX_HEAT[m]}°C</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[color:var(--fridge)]/40 bg-[color:var(--fridge)]/5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("thermo_biga_result")}</div>
          <div className="tabular text-2xl font-bold" style={{ color: "var(--fridge)" }}>
            {res.waterTemp.toFixed(1)}<span className="text-sm ml-0.5">°C</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{t("thermo_biga_target")}</p>
        <p className="text-[10px] text-muted-foreground tabular mt-1">{res.formula}</p>
        {res.needsIce && (
          <p className="text-[11px] mt-2 rounded-md border border-warning/40 bg-warning/10 p-2">{t("thermo_ice")}</p>
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
