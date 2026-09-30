import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/NumberInput";
import { InfoTip } from "@/components/InfoTip";
import { useI18n } from "@/lib/i18n";
import {
  FLOURS, isFlourTooWeak, methodVerdict, styleMinW,
  type WizardMethod,
} from "@/lib/flours";
import { FlourSelect } from "@/components/FlourSelect";
import {
  PIZZA_STYLES, STYLE_CONFIG, styleMidpoint, clampHydrationToStyle,
  type PizzaStyle, type EngineType, type PreFermentType,
} from "@/lib/dough-engine";
import {
  KNEAD_MODES, KNEAD_MODE_LABEL_KEY, SIMPLE_OVENS, SIMPLE_OVEN_LABEL_KEY,
  SIMPLE_OVEN_DEFAULT_MAX, type KneadMode, type SimpleOven,
} from "@/lib/dough-thermo";
import { Check, ChevronLeft, ChevronRight, Wand2, Timer, Hourglass } from "lucide-react";

/** Everything the wizard injects back into the calculator. */
export interface WizardResult {
  style: PizzaStyle;
  flourId: string;
  flourW: number;
  engine: EngineType;
  preFerment: PreFermentType;
  method: WizardMethod;
  hydration: number;
  bigaKneadMode: KneadMode;
  kneadMode: KneadMode;
  simpleOven: SimpleOven;
  ovenMaxTempC: number;
  targetBakeISO: string;
  flourAvailable: number;
  ballWeight: number;
  useOil: boolean;
  oilPct: number;
  useMalt: boolean;
  maltPct: number;
}

const STEPS = [
  "wiz_s1_style", "wiz_s2_flour", "wiz_s3_method", "wiz_s4_hydration",
  "wiz_s5_equipment", "wiz_s6_extras", "wiz_s7_checklist",
] as const;

const METHODS: WizardMethod[] = ["direct_short", "direct_long", "biga", "poolish", "unsure"];

const METHOD_LABEL_KEY: Record<WizardMethod, string> = {
  direct_short: "wiz_m_direct_short",
  direct_long: "wiz_m_direct_long",
  biga: "wiz_m_biga",
  poolish: "wiz_m_poolish",
  unsure: "wiz_m_unsure",
};

type Difficulty = "rookie" | "veteran" | "expert";

const DIFFICULTIES: { id: Difficulty; icon: string; range: [number, number] }[] = [
  { id: "rookie", icon: "🟢", range: [60, 63] },
  { id: "veteran", icon: "🟡", range: [68, 70] },
  { id: "expert", icon: "🔴", range: [75, 80] },
];

function difficultyOf(h: number): Difficulty {
  if (h < 66) return "rookie";
  if (h < 73) return "veteran";
  return "expert";
}

/** Total hands-on minutes vs passive resting hours for the chosen method. */
function sessionTimes(method: WizardMethod, hours: number) {
  const active = method === "biga" || method === "poolish" ? 45 : 30;
  return { activeMin: active, passiveH: Math.max(1, Math.round(hours)) };
}

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
  const [flourId, setFlourId] = useState<string>("caputo_cuoco");
  const [method, setMethod] = useState<WizardMethod>("biga");
  const [hydration, setHydration] = useState<number>(styleMidpoint("contemporanea"));
  const [bigaKneadMode, setBigaKneadMode] = useState<KneadMode>("hand");
  const [kneadMode, setKneadMode] = useState<KneadMode>("spiral");
  const [simpleOven, setSimpleOven] = useState<SimpleOven>("home");
  const [ovenMaxTempC, setOvenMaxTempC] = useState<number>(SIMPLE_OVEN_DEFAULT_MAX.home);
  const [targetBakeISO, setTargetBakeISO] = useState<string>(defaultBakeISO());
  const [flourAvailable, setFlourAvailable] = useState<number>(1000);
  const [ballWeight, setBallWeight] = useState<number>(250);
  const [useOil, setUseOil] = useState(false);
  const [oilPct, setOilPct] = useState(2);
  const [useMalt, setUseMalt] = useState(false);
  const [maltPct, setMaltPct] = useState(0.5);
  const [warnOpen, setWarnOpen] = useState(false);

  const cfg = STYLE_CONFIG[style];
  const flour = useMemo(() => FLOURS.find((f) => f.id === flourId), [flourId]);
  const flourW = flour?.w ?? 300;
  const tooWeak = isFlourTooWeak(flourW, style);
  const indirect = method === "biga" || method === "poolish";
  const last = step === STEPS.length - 1;
  const diff = difficultyOf(hydration);
  const times = sessionTimes(method, indirect ? 24 : method === "direct_short" ? 8 : 24);

  function pickStyle(s: PizzaStyle) {
    setStyle(s);
    setHydration(styleMidpoint(s));
    if (!STYLE_CONFIG[s].allowIndirect && (s !== style)) setMethod("direct_long");
  }

  function next() {
    if (step === 1 && tooWeak) {
      setWarnOpen(true);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function pickDifficulty(d: Difficulty) {
    const range = DIFFICULTIES.find((x) => x.id === d)!.range;
    const mid = Math.round((range[0] + range[1]) / 2);
    setHydration(clampHydrationToStyle(mid, style));
  }

  function apply() {
    const engine: EngineType = indirect && cfg.allowIndirect ? "biga" : "direct";
    onApply({
      style, flourId, flourW,
      engine,
      preFerment: method === "poolish" ? "poolish" : "biga",
      method,
      hydration: clampHydrationToStyle(hydration, style),
      bigaKneadMode: engine === "biga" ? bigaKneadMode : kneadMode,
      kneadMode, simpleOven, ovenMaxTempC,
      targetBakeISO, flourAvailable, ballWeight,
      useOil, oilPct, useMalt, maltPct,
    });
    onOpenChange(false);
    setStep(0);
  }

  const maltDiscouraged = useMalt && ovenMaxTempC > 450;

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

        <div key={step} className="min-h-[240px] space-y-3 py-1 animate-in slide-in-from-right-8 fade-in duration-300">
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
            <div className="space-y-3">
              <FlourSelect value={flourId} onChange={(id: string) => setFlourId(id)} />
              {flour && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <div className="text-xs">
                    <span className="font-semibold uppercase">{flour.brand}</span>
                    <span className="text-muted-foreground"> - {flour.name}</span>
                  </div>
                  <div className="tabular mt-1 text-[11px] text-muted-foreground">
                    W{flour.w} | {flour.protein}g prot · {t(flour.useKey)}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground tabular">
                {t("wiz_style_min_w")} W{styleMinW(style)}
              </p>
              {tooWeak && (
                <p className="text-[11px] rounded-md border border-warning/40 bg-warning/10 p-2 leading-relaxed">
                  {t("wiz_weak_inline")}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              {METHODS.map((m) => {
                const disabled = (m === "biga" || m === "poolish") && !cfg.allowIndirect;
                const verdict = methodVerdict(flourW, m);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMethod(m)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-40 ${
                      method === m ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{t(METHOD_LABEL_KEY[m])}</span>
                      {m !== "unsure" && (
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            verdict === "good"
                              ? "border-[color:var(--success)]/50 text-[color:var(--success)]"
                              : "border-destructive/50 text-destructive"
                          }`}
                        >
                          {verdict === "good" ? `🟢 ${t("wiz_recommended")}` : `🔴 ${t("wiz_not_recommended")}`}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {m === "unsure" ? t("wiz_unsure_hint") : m === "biga" || m === "poolish" ? t("wiz_indirect_hint") : t("wiz_direct_hint")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pickDifficulty(d.id)}
                    className={`rounded-lg border p-2 text-center transition-colors ${
                      diff === d.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="text-base leading-none">{d.icon}</div>
                    <div className="text-[11px] font-semibold mt-1">{t(`wiz_diff_${d.id}`)}</div>
                    <div className="text-[10px] text-muted-foreground tabular">{d.range[0]}–{d.range[1]}%</div>
                  </button>
                ))}
              </div>
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
                  {t("wiz_hydration_hint")} {cfg.hydrMin}–{cfg.hydrMax}% · {t(`wiz_diff_${diff}`)}
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {indirect ? (
                <>
                  <ModePicker label={t("wiz_biga_equipment")} value={bigaKneadMode} onChange={setBigaKneadMode} t={t} />
                  <ModePicker label={t("wiz_refresh_equipment")} value={kneadMode} onChange={setKneadMode} t={t} />
                </>
              ) : (
                <ModePicker label={t("wiz_single_equipment")} value={kneadMode} onChange={setKneadMode} t={t} />
              )}
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
            <div className="space-y-4">
              <OptionRow
                label={t("add_oil")}
                info={t("info_oil_impact")}
                enabled={useOil}
                onToggle={setUseOil}
                value={oilPct}
                onValue={setOilPct}
                min={0.5}
                max={5}
              />
              <OptionRow
                label={t("add_malt")}
                info={t("info_malt_impact")}
                enabled={useMalt}
                onToggle={setUseMalt}
                value={maltPct}
                onValue={setMaltPct}
                min={0.2}
                max={1}
              />
              {maltDiscouraged && (
                <p className="text-[11px] rounded-md border border-warning/40 bg-warning/10 p-2 leading-relaxed">
                  {t("wiz_malt_hot_oven")}
                </p>
              )}
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
                  <NumberInput value={flourAvailable} onChange={setFlourAvailable} min={100} max={100000} step={50} fallback={1000} className="tabular mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("ball_weight")}
                  </Label>
                  <NumberInput value={ballWeight} onChange={setBallWeight} min={100} max={1500} step={5} fallback={250} className="tabular mt-1 h-9" />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Timer className="size-3.5" />{t("wiz_active_time")}
                  </div>
                  <div className="tabular text-xl font-bold mt-1">{times.activeMin} min</div>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Hourglass className="size-3.5" />{t("wiz_passive_time")}
                  </div>
                  <div className="tabular text-xl font-bold mt-1">{times.passiveH} h</div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold">{t("wiz_preflight")}</div>
                {["wiz_check_ice", "wiz_check_boxes", "wiz_check_semolina"].map((k) => (
                  <div key={k} className="flex gap-2 text-[11px] leading-relaxed">
                    <Check className="size-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{t(k)}</span>
                  </div>
                ))}
              </div>

              <ul className="space-y-1.5">
                {[
                  `${t("wiz_s1_style")}: ${t(cfg.labelKey)}`,
                  `${t("wiz_s2_flour")}: ${flour ? `${flour.brand} - ${flour.name} (W${flour.w} | ${flour.protein}g prot)` : "—"}`,
                  `${t("wiz_s3_method")}: ${t(METHOD_LABEL_KEY[method])}`,
                  `${t("hydration")}: ${hydration}% · ${t(`wiz_diff_${diff}`)}`,
                  indirect
                    ? `${t("wiz_biga_equipment")}: ${t(KNEAD_MODE_LABEL_KEY[bigaKneadMode])} · ${t("wiz_refresh_equipment")}: ${t(KNEAD_MODE_LABEL_KEY[kneadMode])}`
                    : `${t("wiz_single_equipment")}: ${t(KNEAD_MODE_LABEL_KEY[kneadMode])}`,
                  `${t("oven_type")}: ${t(SIMPLE_OVEN_LABEL_KEY[simpleOven])} · ${ovenMaxTempC}°C`,
                  `${t("flour_available")}: ${flourAvailable} g · ${ballWeight} g`,
                ].map((line) => (
                  <li key={line} className="flex gap-2 text-xs leading-relaxed">
                    <Check className="size-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
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
            <Button type="button" size="sm" onClick={next}>
              {t("wiz_next")}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={warnOpen} onOpenChange={setWarnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {t("wiz_incompat_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wiz_incompat_body")
                .replace("{flour}", flour ? `${flour.brand} - ${flour.name}` : "—")
                .replace("{style}", t(cfg.labelKey))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>{t("wiz_incompat_change_flour")}</AlertDialogCancel>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setWarnOpen(false);
                setStep(0);
              }}
            >
              {t("wiz_incompat_change_style")}
            </Button>
            <AlertDialogAction onClick={() => setStep(2)}>
              {t("wiz_incompat_continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function OptionRow({
  label, info, enabled, onToggle, value, onValue, min, max,
}: {
  label: string;
  info: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  value: number;
  onValue: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {label}
          <InfoTip>{info}</InfoTip>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <Slider value={[value]} min={min} max={max} step={0.1} onValueChange={(v) => onValue(v[0])} />
          <span className="tabular text-xs font-semibold w-12 text-right">{value.toFixed(1)}%</span>
        </div>
      )}
    </div>
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
