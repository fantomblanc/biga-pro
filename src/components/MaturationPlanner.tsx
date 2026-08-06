import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/NumberInput";
import { useI18n } from "@/lib/i18n";
import { maturationRange, maturationVerdict } from "@/lib/flours";
import {
  PREFERMENT_LOCATIONS,
  PREFERMENT_LOCATION_LABEL_KEY,
  prefermentProfile,
  type PrefermentLocation,
} from "@/lib/dough-pro";
import type { PreFermentType } from "@/lib/dough-engine";
import { Snowflake, Thermometer, CheckCircle2, AlertTriangle } from "lucide-react";

export interface MaturationPlan {
  prefermentLoc: PrefermentLocation;
  prefermentHours: number;
  /** Step 1 — optional bulk rest of the whole dough mass. */
  bulkFridgeH: number;
  bulkRoomH: number;
  /** Step 3 — cold maturation of the shaped balls (fridge 4°C). */
  ballsFridgeH: number;
  /** Step 4 — final temper / proof of the balls at room temperature. */
  proofRoomH: number;
}


interface Props {
  plan: MaturationPlan;
  onChange: (p: MaturationPlan) => void;
  /** Hide the pre-ferment block for the direct method. */
  showPreferment: boolean;
  preFerment: PreFermentType;
  flourW: number;
  bare?: boolean;
}

/**
 * Hybrid maturation, split in two clearly separated stages:
 *   1. pre-ferment maturation (place + hours)
 *   2. final dough: bulk rest (fridge / room) then shaped-ball proof at room T°
 */
export function MaturationPlanner({ plan, onChange, showPreferment, preFerment, flourW, bare }: Props) {
  const { t } = useI18n();
  const set = (patch: Partial<MaturationPlan>) => onChange({ ...plan, ...patch });

  const prefH = showPreferment ? Math.max(0, plan.prefermentHours) : 0;
  const total = prefH + Math.max(0, plan.bulkFridgeH) + Math.max(0, plan.bulkRoomH)
    + Math.max(0, plan.ballsFridgeH ?? 0) + Math.max(0, plan.proofRoomH);

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

  const body = (
    <div className="space-y-4">
      {!bare && (
        <div className="flex items-center gap-2">
          <Snowflake className="size-4 text-[color:var(--fridge)]" />
          <h3 className="font-display font-semibold text-sm">{t("mat_title")}</h3>
        </div>
      )}

      {showPreferment && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-primary/80">
            1 · {t("mat_preferment_section")}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PREFERMENT_LOCATIONS.map((loc) => {
              const active = plan.prefermentLoc === loc;
              const prof = prefermentProfile(loc, preFerment);
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => set({ prefermentLoc: loc, prefermentHours: prof.hours })}
                  className={`min-h-11 rounded-md border px-2 py-1.5 text-[11px] font-medium leading-tight transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t(PREFERMENT_LOCATION_LABEL_KEY[loc])}
                  <span className="block text-[9px] opacity-70 tabular">{prof.tempC}°C</span>
                </button>
              );
            })}
          </div>
          <HField
            label={t("mat_preferment_hours")}
            value={plan.prefermentHours}
            onChange={(v) => set({ prefermentHours: v })}
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(prefermentProfile(plan.prefermentLoc, preFerment).descKey)}
          </p>
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-border/50">
        <div className="text-[10px] uppercase tracking-widest font-bold text-primary/80 pt-2">
          {showPreferment ? "2 · " : "1 · "}{t("mat_final_section")}
        </div>

        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="text-[11px] font-semibold">{t("mat_s1_bulk")}</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{t("mat_s1_bulk_desc")}</p>
          <div className="grid grid-cols-2 gap-2">
            <HField
              icon={<Snowflake className="size-3.5 text-[color:var(--fridge)]" />}
              label={t("mat_bulk_fridge")}
              value={plan.bulkFridgeH}
              onChange={(v) => set({ bulkFridgeH: v })}
            />
            <HField
              icon={<Thermometer className="size-3.5 text-[color:var(--final)]" />}
              label={t("mat_bulk_room")}
              value={plan.bulkRoomH}
              onChange={(v) => set({ bulkRoomH: v })}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="text-[11px] font-semibold">{t("mat_s2_balling")}</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{t("mat_s2_balling_desc")}</p>
        </div>

        <div className="rounded-lg border border-[color:var(--fridge)]/40 p-3 space-y-2">
          <div className="text-[11px] font-semibold">{t("mat_s3_cold_balls")}</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{t("mat_s3_cold_balls_desc")}</p>
          <HField
            icon={<Snowflake className="size-3.5 text-[color:var(--fridge)]" />}
            label={t("mat_s3_field")}
            value={plan.ballsFridgeH ?? 0}
            onChange={(v) => set({ ballsFridgeH: v })}
          />
        </div>

        <div className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="text-[11px] font-semibold">{t("mat_s4_temper")}</div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{t("mat_s4_temper_desc")}</p>
          <HField
            icon={<Thermometer className="size-3.5 text-[color:var(--final)]" />}
            label={t("mat_proof_room")}
            value={plan.proofRoomH}
            onChange={(v) => set({ proofRoomH: v })}
          />
        </div>

      </div>

      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
          backgroundColor: `color-mix(in oklab, ${color} 8%, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("mat_total")}</div>
            <div className="tabular text-2xl font-bold mt-0.5" style={{ color }}>
              {total}<span className="text-sm text-muted-foreground ml-1">{t("maturation_hours")}</span>
            </div>
          </div>
          <Icon className="size-6 shrink-0" style={{ color }} />
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color }}>{t(msgKey)}</p>
        <p className="mt-1.5 text-[10px] text-muted-foreground tabular">
          {t("maturation_range").replace("{w}", String(flourW)).replace("{min}", String(lo)).replace("{max}", String(hi))}
        </p>
      </div>
    </div>
  );

  return bare ? body : <Card className="p-4 border-[color:var(--fridge)]/30">{body}</Card>;
}

function HField({
  icon, label, value, onChange,
}: { icon?: React.ReactNode; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </Label>
      <div className="relative mt-1">
        <NumberInput
          min={0}
          step={0.5}
          fallback={0}
          value={value}
          onChange={(v) => onChange(Math.max(0, v))}
          className="tabular pr-8 h-9"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">h</span>
      </div>

    </div>
  );
}
