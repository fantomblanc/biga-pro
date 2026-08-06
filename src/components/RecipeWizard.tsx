import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/NumberInput";
import { useI18n } from "@/lib/i18n";
import { FLOURS } from "@/lib/flours";
import {
  PIZZA_STYLES, STYLE_CONFIG, styleMidpoint, clampHydrationToStyle,
  type PizzaStyle, type EngineType, type PreFermentType,
} from "@/lib/dough-engine";
import {
  KNEAD_MODES, KNEAD_MODE_LABEL_KEY, SIMPLE_OVENS, SIMPLE_OVEN_LABEL_KEY,
  SIMPLE_OVEN_DEFAULT_MAX, type KneadMode, type SimpleOven,
} from "@/lib/dough-thermo";
import { Check, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";

/** Everything the wizard injects back into the calculator. */
export interface WizardResult {
  style: PizzaStyle;
  flourId: string;
  flourW: number;
  engine: EngineType;
  preFerment: PreFermentType;
  hydration: number;
  bigaKneadMode: KneadMode;
  kneadMode: KneadMode;
  simpleOven: SimpleOven;
  ovenMaxTempC: number;
  targetBakeISO: string;
  flourAvailable: number;
  ballWeight: number;
}

const STEPS = [
  "wiz_s1_style", "wiz_s2_flour", "wiz_s3_method", "wiz_s4_hydration",
  "wiz_s5_equipment", "wiz_s6_timing", "wiz_s7_checklist",
] as const;

function defaultBakeISO(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecipeWizard({
  open, onOpenChange, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (r: WizardResult) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const [style, setStyle] = useState<PizzaStyle>("contemporanea");
  const [flourId, setFlourId] = useState<string>(FLOURS[0]?.id ?? "");
  const [engine, setEngine] = useState<EngineType>("biga");
  const [preFerment, setPreFerment] = useState<PreFermentType>("biga");
  const [hydration, setHydration] = useState<number>(styleMidpoint("contemporanea"));
  const [bigaKneadMode, setBigaKneadMode] = useState<KneadMode>("hand");
  const [kneadMode, setKneadMode] = useState<KneadMode>("spiral");
  const [simpleOven, setSimpleOven] = useState<SimpleOven>("home");
  const [ovenMaxTempC, setOvenMaxTempC] = useState<number>(SIMPLE_OVEN_DEFAULT_MAX.home);
  const [targetBakeISO, setTargetBakeISO] = useState<string>(defaultBakeISO());
  const [flourAvailable, setFlourAvailable] = useState<number>(1000);
  const [ballWeight, setBallWeight] = useState<number>(250);

  const cfg = STYLE_CONFIG[style];
  const flour = useMemo(() => FLOURS.find((f) => f.id === flourId), [flourId]);
  const last = step === STEPS.length - 1;

  function pickStyle(s: PizzaStyle) {
    setStyle(s);
    setHydration(styleMidpoint(s));
    if (!STYLE_CONFIG[s].allowIndirect) {
      setEngine("direct");
    }
  }

  function apply() {
    onApply({
      style, flourId, flourW: flour?.w ?? 300,
      engine: cfg.allowIndirect ? engine : "direct",
      preFerment, hydration: clampHydrationToStyle(hydration, style),
      bigaKneadMode, kneadMode, simpleOven, ovenMaxTempC,
      targetBakeISO, flourAvailable, ballWeight,
    });
    onOpenChange(false);
    setStep(0);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Wand2 className="size-4 text-primary" />
            {t("wiz_title")}
          </DialogTitle>
          <DialogDescription>
            {t("wiz_step")} {step + 1}/{STEPS.length} · {t(STEPS[step])}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        <div className="min-h-[240px] space-y-3 py-1">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {PIZZA_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickStyle(s)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    style === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-xs font-semibold">{t(STYLE_CONFIG[s].labelKey)}</div>
                  <div className="text-[10px] text-muted-foreground tabular">
                    {STYLE_CONFIG[s].hydrMin}–{STYLE_CONFIG[s].hydrMax}%
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              {FLOURS.slice(0, 12).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFlourId(f.id)}
                  className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                    flourId === f.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold">{f.name}</span>
                    <span className="tabular text-[11px] text-primary">W {f.w}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["biga", "direct"] as EngineType[]).map((e) => {
                  const disabled = e === "biga" && !cfg.allowIndirect;
                  return (
                    <button
                      key={e}
                      type="button"
                      disabled={disabled}
                      onClick={() => setEngine(e)}
                      className={`rounded-lg border p-3 text-left transition-colors disabled:opacity-40 ${
                        engine === e ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        {e === "biga" ? t("engine_biga") : t("engine_direct")}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {e === "biga" ? t("wiz_indirect_hint") : t("wiz_direct_hint")}
                      </div>
                    </button>
                  );
                })}
              </div>
              {engine === "biga" && (
                <div className="grid grid-cols-2 gap-2">
                  {(["biga", "poolish"] as PreFermentType[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreFerment(p)}
                      className={`rounded-lg border p-2.5 text-xs font-semibold transition-colors ${
                        preFerment === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {p === "biga" ? t("pf_biga") : t("pf_poolish")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("hydration")}
                  </Label>
                  <span className="tabular text-lg font-bold text-primary">{hydration}%</span>
                </div>
                <Slider
                  value={[hydration]}
                  min={cfg.hydrMin}
                  max={cfg.hydrMax}
                  step={1}
                  onValueChange={(v) => setHydration(v[0])}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("wiz_hydration_hint")} {cfg.hydrMin}–{cfg.hydrMax}%
                </p>
              </div>
              {flour && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {flour.name} · W {flour.w}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <ModePicker
                label={t("wiz_biga_equipment")}
                value={bigaKneadMode}
                onChange={setBigaKneadMode}
                t={t}
              />
              <ModePicker
                label={t("wiz_refresh_equipment")}
                value={kneadMode}
                onChange={setKneadMode}
                t={t}
              />
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("oven_type")}
                </Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {SIMPLE_OVENS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        setSimpleOven(o);
                        setOvenMaxTempC(SIMPLE_OVEN_DEFAULT_MAX[o]);
                      }}
                      className={`h-10 rounded-md border text-xs font-medium transition-colors ${
                        simpleOven === o ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {t(SIMPLE_OVEN_LABEL_KEY[o])}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("oven_max_temp")}
                </Label>
                <NumberInput
                  value={ovenMaxTempC}
                  onChange={setOvenMaxTempC}
                  min={200}
                  max={550}
                  step={5}
                  fallback={SIMPLE_OVEN_DEFAULT_MAX[simpleOven]}
                  className="tabular mt-1 h-9"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("wiz_bake_time")}
                </Label>
                <Input
                  type="datetime-local"
                  value={targetBakeISO}
                  onChange={(e) => setTargetBakeISO(e.target.value)}
                  className="tabular mt-1 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("flour_available")}
                  </Label>
                  <NumberInput
                    value={flourAvailable}
                    onChange={setFlourAvailable}
                    min={100}
                    max={100000}
                    step={50}
                    fallback={1000}
                    className="tabular mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("ball_weight")}
                  </Label>
                  <NumberInput
                    value={ballWeight}
                    onChange={setBallWeight}
                    min={100}
                    max={1500}
                    step={5}
                    fallback={250}
                    className="tabular mt-1 h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <ul className="space-y-2">
              {[
                `${t("wiz_s1_style")}: ${t(cfg.labelKey)}`,
                `${t("wiz_s2_flour")}: ${flour?.name ?? "—"} (W ${flour?.w ?? "—"})`,
                `${t("wiz_s3_method")}: ${
                  engine === "biga"
                    ? `${t("engine_biga")} · ${preFerment === "biga" ? t("pf_biga") : t("pf_poolish")}`
                    : t("engine_direct")
                }`,
                `${t("hydration")}: ${hydration}%`,
                `${t("wiz_biga_equipment")}: ${t(KNEAD_MODE_LABEL_KEY[bigaKneadMode])}`,
                `${t("wiz_refresh_equipment")}: ${t(KNEAD_MODE_LABEL_KEY[kneadMode])}`,
                `${t("oven_type")}: ${t(SIMPLE_OVEN_LABEL_KEY[simpleOven])} · ${ovenMaxTempC}°C`,
                `${t("flour_available")}: ${flourAvailable} g · ${ballWeight} g`,
              ].map((line) => (
                <li key={line} className="flex gap-2 text-xs leading-relaxed">
                  <Check className="size-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-4" />
            {t("wiz_back")}
          </Button>
          {last ? (
            <Button type="button" size="sm" onClick={apply}>
              {t("wiz_apply")}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              {t("wiz_next")}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModePicker({
  label, value, onChange, t,
}: {
  label: string;
  value: KneadMode;
  onChange: (m: KneadMode) => void;
  t: (k: string) => string;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-2 mt-1.5">
        {KNEAD_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`min-h-10 rounded-md border px-2 text-[11px] font-medium transition-colors ${
              value === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {t(KNEAD_MODE_LABEL_KEY[m])}
          </button>
        ))}
      </div>
    </div>
  );
}
