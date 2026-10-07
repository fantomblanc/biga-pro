import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { FlourSelect } from "@/components/FlourSelect";
import { BigaWaterModule } from "@/components/BigaWaterModule";
import { RefreshWaterModule } from "@/components/RefreshWaterModule";
import { MaturationPlanner, type MaturationPlan } from "@/components/MaturationPlanner";
import { LabelWithInfo } from "@/components/InfoTip";
import { FLOURS, maturationRange } from "@/lib/flours";
import {
  calculateRecipe,
  buildTimeline,
  styleMidpoint,
  STYLE_CONFIG,
  PIZZA_STYLES,
  flourCategory,
  type RecipeInputs,
  type EngineType,
  type YeastType,
  type PreFermentType,
  type PizzaStyle,
  type TrayConfig,
  bigaYeastPctPro, type BigaFermMode,
} from "@/lib/dough-engine";
import {
  bakeTargets,
  hydrationCeiling,
  clampHydrationPro,
  tenacityAdjust,
  blendW,
  wCompat,
  W_COMPAT_LABEL_KEY,
  DEFAULT_AUTOLYSE,
  computeAutolyse,
  type AutolyseConfig,
  type FlourBlend,
  prefermentProfile,
  doughPerTray,
  TRAY_PRESETS,
  avpnRules,
  BIGA_HYDR_MIN,
  BIGA_HYDR_MAX,
  BIGA_HYDR_DEFAULT,
} from "@/lib/dough-pro";
import {
  SIMPLE_OVENS,
  SIMPLE_OVEN_LABEL_KEY,
  SIMPLE_OVEN_DEFAULT_MAX,
  REFRESH_FRICTION,
  capBand,
  ballPreview,
  type SimpleOven,
  type KneadMode,
} from "@/lib/dough-thermo";
import { setActiveId } from "@/lib/storage";
import { saveRecipe } from "@/lib/cloud";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { NumberInput } from "@/components/NumberInput";
import { SosDough } from "@/components/SosDough";
import { RecipeWizard, type WizardResult } from "@/components/RecipeWizard";
import { AlertTriangle, Save, Pizza, Wheat, Gauge, Thermometer, ChefHat, Sprout, Droplets, Snowflake, RefreshCw, Trash2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Recipe · CarpiBiga Pro" },
      { name: "description", content: "Guided pizza wizard: flour-first weighing, split water-temperature modules, staged maturation and oven targets." },
      { property: "og:title", content: "New Recipe · CarpiBiga Pro" },
      { property: "og:description", content: "Flour-first dough calculator with Biga and refreshment water modules, staged maturation and oven targets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRecipePage,
});

const DRAFT_KEY = "carpibiga_draft_new";

function defaultBakeISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(19, 0, 0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function NewRecipePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ---------------- state ---------------- */
  const [style, setStyle] = useState<PizzaStyle>("contemporanea");
  const [method, setMethod] = useState<"direct" | "indirect">("indirect");
  const [preFerment, setPreFerment] = useState<PreFermentType>("biga");

  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  // Flour-first weighing
  const [flourGrams, setFlourGrams] = useState(1000);
  const [targetBallWeight, setTargetBallWeight] = useState(260);

  const [hydration, setHydr] = useState(styleMidpoint("contemporanea"));
  const [saltPct, setSalt] = useState(2.5);
  const [yeastType, setYeast] = useState<YeastType>("fresh");
  const [flourW, setFlourW] = useState(340);
  const [flourId, setFlourId] = useState<string>("");

  const [useMalt, setUseMalt] = useState(false);
  const [maltPct, setMalt] = useState(1);
  const [useOil, setUseOil] = useState(false);
  const [oilPct, setOil] = useState(2);
  const [bigaPct, setBigaPct] = useState(80);
  const [targetBake, setTargetBake] = useState(defaultBakeISO());

  const [tenacity, setTenacity] = useState(0);
  const [blend, setBlend] = useState<FlourBlend>({ enabled: false, flourAId: "", flourBId: "", ratioA: 50 });
  const [autolyse, setAutolyse] = useState<AutolyseConfig>(DEFAULT_AUTOLYSE);
  const [trays, setTrays] = useState<TrayConfig>({ count: 2, lengthCm: 40, widthCm: 30, coef: 0.6 });
  const [bigaHydr, setBigaHydr] = useState(BIGA_HYDR_DEFAULT);
  const [useRefreshYeast, setUseRefreshYeast] = useState(false);
  const [refreshYeastPct, setRefreshYeastPct] = useState(0.1);
  const [bigaFermMode, setBigaFermMode] = useState<BigaFermMode>("ambient");
  const [bigaRoomTemp, setBigaRoomTemp] = useState(20);
  const [bigaHours, setBigaHours] = useState(18);
  const [advise8020, setAdvise8020] = useState(true);

  // Thermal modules
  const [kneadMode, setKneadMode] = useState<KneadMode>("hand");
  // Independent equipment for the Biga / pre-ferment mix.
  const [bigaKneadMode, setBigaKneadMode] = useState<KneadMode>("hand");
  const [storageTemp, setStorageTemp] = useState(18);
  const [bigaFlourTemp, setBigaFlourTemp] = useState(20);
  const [bigaRealTemp, setBigaRealTemp] = useState(18);
  const [refreshFlourTemp, setRefreshFlourTemp] = useState(20);
  const [ambientTemp, setAmbientTemp] = useState(22);
  const [refreshFriction, setRefreshFriction] = useState(REFRESH_FRICTION.hand);

  // Oven (simplified)
  const [simpleOven, setSimpleOven] = useState<SimpleOven>("pro");
  const [ovenMaxTemp, setOvenMaxTemp] = useState(SIMPLE_OVEN_DEFAULT_MAX.pro);

  // Maturation plan
  const [maturation, setMaturation] = useState<MaturationPlan>({
    prefermentLoc: "cellar",
    prefermentHours: 18,
    bulkFridgeH: 24,
    bulkRoomH: 1,
    ballsFridgeH: 0,
    proofRoomH: 4,
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  /** Hydration chosen in the wizard, applied instead of the style midpoint. */
  const pendingHydr = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  const cfg = STYLE_CONFIG[style];
  const isTeglia = style === "teglia";
  const avpn = avpnRules(style);
  const engine: EngineType = method === "indirect" ? "biga" : "direct";
  const bigaPctEdited = useRef(false);

  /* ---------------- draft autosave ---------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.style) setStyle(d.style);
        if (d.method) setMethod(d.method);
        if (d.preFerment) setPreFerment(d.preFerment);
        if (typeof d.name === "string") setName(d.name);
        if (typeof d.nameEdited === "boolean") setNameEdited(d.nameEdited);
        if (typeof d.flourGrams === "number") setFlourGrams(d.flourGrams);
        if (typeof d.targetBallWeight === "number") setTargetBallWeight(d.targetBallWeight);
        if (typeof d.hydration === "number") setHydr(d.hydration);
        if (typeof d.saltPct === "number") setSalt(d.saltPct);
        if (d.yeastType) setYeast(d.yeastType);
        if (typeof d.flourW === "number") setFlourW(d.flourW);
        if (typeof d.flourId === "string") setFlourId(d.flourId);
        if (typeof d.useMalt === "boolean") setUseMalt(d.useMalt);
        if (typeof d.maltPct === "number") setMalt(d.maltPct);
        if (typeof d.useOil === "boolean") setUseOil(d.useOil);
        if (typeof d.oilPct === "number") setOil(d.oilPct);
        if (typeof d.bigaPct === "number") setBigaPct(d.bigaPct);
        if (typeof d.targetBake === "string") setTargetBake(d.targetBake);
        if (typeof d.tenacity === "number") setTenacity(d.tenacity);
        if (d.blend) setBlend(d.blend);
        if (d.autolyse) setAutolyse(d.autolyse);
        if (d.trays) setTrays(d.trays);
        if (typeof d.bigaHydr === "number") setBigaHydr(d.bigaHydr);
        if (typeof d.useRefreshYeast === "boolean") setUseRefreshYeast(d.useRefreshYeast);
        if (typeof d.refreshYeastPct === "number") setRefreshYeastPct(d.refreshYeastPct);
        if (d.kneadMode) setKneadMode(d.kneadMode);
        if (d.bigaKneadMode) setBigaKneadMode(d.bigaKneadMode);
        if (typeof d.storageTemp === "number") setStorageTemp(d.storageTemp);
        if (typeof d.bigaFlourTemp === "number") setBigaFlourTemp(d.bigaFlourTemp);
        if (typeof d.bigaRealTemp === "number") setBigaRealTemp(d.bigaRealTemp);
        if (typeof d.refreshFlourTemp === "number") setRefreshFlourTemp(d.refreshFlourTemp);
        if (typeof d.ambientTemp === "number") setAmbientTemp(d.ambientTemp);
        if (typeof d.refreshFriction === "number") setRefreshFriction(d.refreshFriction);
        if (d.simpleOven) setSimpleOven(d.simpleOven);
        if (typeof d.ovenMaxTemp === "number") setOvenMaxTemp(d.ovenMaxTemp);
        if (d.maturation) setMaturation({ ballsFridgeH: 0, ...d.maturation });
        toast.success(t("draft_restored"));
      }
    } catch {
      /* ignore corrupted draft */
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draft = {
    style, method, preFerment, name, nameEdited, flourGrams, targetBallWeight, hydration, saltPct,
    yeastType, flourW, flourId, useMalt, maltPct, useOil, oilPct, bigaPct, targetBake, tenacity,
    blend, autolyse, trays, bigaHydr, useRefreshYeast, refreshYeastPct, kneadMode, bigaKneadMode, storageTemp,
    bigaFlourTemp, bigaRealTemp, refreshFlourTemp, ambientTemp, refreshFriction, simpleOven,
    ovenMaxTemp, maturation,
  };

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* quota */
    }
  }, [JSON.stringify(draft)]);

  /* ---------------- derived ---------------- */
  useEffect(() => {
    if (pendingHydr.current !== null) {
      setHydr(pendingHydr.current);
      pendingHydr.current = null;
    } else {
      setHydr(styleMidpoint(style));
    }
    if (!cfg.allowIndirect && method !== "direct") setMethod("direct");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // Default pre-ferment share follows the pre-ferment type only while the user
  // has not moved the slider — no silent reset of a manual choice.
  useEffect(() => {
    if (method !== "indirect" || bigaPctEdited.current) return;
    setBigaPct(preFerment === "poolish" ? 30 : 80);
  }, [preFerment, method]);

  useEffect(() => {
    if (avpn.banOilAndMalt) { setUseMalt(false); setUseOil(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avpn.banOilAndMalt]);

  // Pre-ferment place drives its default storage temperature.
  useEffect(() => {
    if (method !== "indirect") return;
    const prof = prefermentProfile(maturation.prefermentLoc, preFerment);
    setStorageTemp(prof.tempC);
    setBigaRealTemp(prof.tempC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maturation.prefermentLoc, preFerment, method]);

  // Equipment change resets friction to the default of that machine.
  useEffect(() => {
    setRefreshFriction(REFRESH_FRICTION[kneadMode]);
  }, [kneadMode]);

  useEffect(() => {
    setOvenMaxTemp(SIMPLE_OVEN_DEFAULT_MAX[simpleOven]);
  }, [simpleOven]);

  const hydrCeiling = hydrationCeiling(style, engine === "biga", bigaPct);
  const clampedHydration = clampHydrationPro(hydration, style, engine === "biga", bigaPct);
  const effectiveFlourW = blend.enabled ? blendW(blend, flourW) : flourW;
  const totalMaturationHours = (engine === "biga" ? maturation.prefermentHours : 0)
    + maturation.bulkFridgeH + maturation.bulkRoomH + (maturation.ballsFridgeH ?? 0) + maturation.proofRoomH;
  const [, maximumMaturationHours] = maturationRange(effectiveFlourW);
  const compat = wCompat(
    effectiveFlourW,
    engine === "biga",
    clampedHydration,
    style,
    totalMaturationHours,
  );

  const tenacityResult = tenacityAdjust(tenacity, saltPct, clampedHydration);
  const effectiveSalt = avpn.active
    ? Math.min(avpn.saltMax, Math.max(avpn.saltMin, tenacityResult.saltPct))
    : tenacityResult.saltPct;

  const trayWeight = doughPerTray(trays.lengthCm, trays.widthCm, trays.coef);
  const unitWeight = isTeglia ? trayWeight : targetBallWeight;

  const autolyseResult = useMemo(
    () => computeAutolyse(autolyse, flourGrams, flourGrams * (clampedHydration / 100), effectiveFlourW),
    [autolyse, flourGrams, clampedHydration, effectiveFlourW],
  );
  const autolysePenalty = autolyse.enabled ? autolyseResult.waterTempPenalty : 0;

  const preFermentHydrPct = preFerment === "poolish" ? 100 : bigaHydr;
  const bulkFactorMin = engine === "direct" ? Math.round(30 * tenacityResult.bulkFactor) : undefined;

  // Provisional dough weight to derive the ball count fed into the engine.
  const divisor = 1 + clampedHydration / 100 + effectiveSalt / 100
    + (useMalt ? maltPct / 100 : 0) + (useOil ? oilPct / 100 : 0);
  const provisionalDough = flourGrams * divisor;
  const preview = ballPreview(provisionalDough, unitWeight);

  const inputs: RecipeInputs = useMemo(() => ({
    engine,
    ballsCount: Math.max(1, preview.ballsCount),
    ballWeight: unitWeight,
    hydration: clampedHydration,
    saltPct: effectiveSalt,
    yeastType,
    flourW: effectiveFlourW,
    useMalt: avpn.banOilAndMalt ? false : useMalt,
    maltPct,
    useOil: avpn.banOilAndMalt ? false : useOil,
    oilPct,
    cellarTemp: engine === "biga" ? storageTemp : ambientTemp,
    bigaPct,
    style,
    preFerment: engine === "biga" ? preFerment : undefined,
    targetBakeISO: new Date(targetBake).toISOString(),
    ovenType: simpleOven === "home" ? "domestic" : "electric_pro",
    simpleOven,
    ovenMaxTempC: ovenMaxTemp,
    tenacity,
    autolyse,
    blend,
    prefermentLoc: engine === "biga" ? maturation.prefermentLoc : undefined,
    preFermentHydrPct: engine === "biga" ? preFermentHydrPct : undefined,
    refreshYeastPct: engine === "biga" && useRefreshYeast ? refreshYeastPct : 0,
    bigaFermMode: engine === "biga" && preFerment === "biga" ? bigaFermMode : undefined,
    bigaRoomTemp,
    bigaHours,
    trays: isTeglia ? trays : undefined,
    kneadMode,
    bigaKneadMode,
    mixer: kneadMode === "hand" ? "hand" : "spiral",
    storageTemp,
    bigaRealTemp,
    refreshFlourTemp,
    refreshFriction,
    flourTemp: bigaFlourTemp,
    ambientTemp,
    autolyseTempPenalty: autolysePenalty,
    bulkOverrideMin: bulkFactorMin,
    flourAvailable: flourGrams,
    targetBallWeight: unitWeight,
    maturation,
  }), [engine, preview.ballsCount, unitWeight, clampedHydration, effectiveSalt, yeastType, effectiveFlourW,
    useMalt, maltPct, useOil, oilPct, storageTemp, ambientTemp, bigaPct, style, preFerment, targetBake,
    simpleOven, ovenMaxTemp, tenacity, autolyse, blend, maturation, preFermentHydrPct, isTeglia, trays,
    kneadMode, bigaKneadMode, bigaRealTemp, refreshFlourTemp, refreshFriction, bigaFlourTemp, autolysePenalty,
    useRefreshYeast, refreshYeastPct, bigaFermMode, bigaRoomTemp, bigaHours, bulkFactorMin, flourGrams, avpn.banOilAndMalt]);

  const calc = useMemo(() => calculateRecipe(inputs), [inputs]);
  const finalProofH = Math.max(0.5, maturation.proofRoomH);
  const timeline = useMemo(() => buildTimeline(inputs, finalProofH), [inputs, finalProofH]);

  const rawTargets = bakeTargets(style, simpleOven === "home" ? "domestic" : "electric_pro", engine, clampedHydration);
  const bt = {
    ...rawTargets,
    voute: capBand(rawTargets.voute, ovenMaxTemp),
    sole: capBand(rawTargets.sole, ovenMaxTemp),
  };
  const ovenCapped = rawTargets.voute[1] > ovenMaxTemp;

  const adjustedCalc = useMemo(() => ({
    ...calc,
    bakeVoute: bt.voute,
    bakeSole: bt.sole,
    bakeTipKey: bt.tipKey,
  }), [calc, bt.voute, bt.sole, bt.tipKey]);

  /* ---------------- automatic recipe name ---------------- */
  const flourLabel = useMemo(() => {
    if (blend.enabled) {
      const a = FLOURS.find((f) => f.id === blend.flourAId);
      const b = FLOURS.find((f) => f.id === blend.flourBId);
      if (a && b) return `${a.brand} ${a.name} / ${b.brand} ${b.name} (${blend.ratioA}/${100 - blend.ratioA})`;
      return `W${effectiveFlourW}`;
    }
    const f = FLOURS.find((x) => x.id === flourId);
    return f ? `${f.brand} ${f.name}` : `W${flourW}`;
  }, [blend, flourId, flourW, effectiveFlourW]);

  const methodLabel = engine === "direct"
    ? t("method_direct")
    : `${preFerment === "poolish" ? t("preferment_poolish") : t("preferment_biga")} ${bigaPct}%`;

  const autoName = `${t(cfg.labelKey)} - ${clampedHydration}% Hydra - ${flourLabel} - ${methodLabel}`;

  useEffect(() => {
    if (!nameEdited) setName(autoName);
  }, [autoName, nameEdited]);

  /* ---------------- save ---------------- */
  async function save() {
    if (!user) {
      toast.error(t("auth_required"));
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveRecipe({
        id: crypto.randomUUID(),
        name: name.trim() || autoName,
        createdAt: new Date().toISOString(),
        inputs,
        calc: adjustedCalc,
        timeline,
        finalProofH,
        notes: "",
        photos: [],
      });
      setActiveId(saved.id);
      localStorage.removeItem(DRAFT_KEY);
      toast.success(t("recipe_saved"));
      navigate({ to: "/recipe/$id", params: { id: saved.id } });
    } catch (e) {
      console.error(e);
      toast.error(t("cloud_error"));
    } finally {
      setSaving(false);
    }
  }

  const yeastShown = engine === "biga" ? calc.bigaYeastShown : calc.directYeastShown;
  const isPoolish = engine === "biga" && preFerment === "poolish";
  const preLabels = {
    phase: isPoolish ? t("poolish_phase") : t("biga_phase"),
    flour: isPoolish ? t("poolish_flour_dyn") : t("biga_flour_dyn"),
    water: isPoolish ? t("poolish_water") : t("biga_water"),
    yeast: isPoolish ? t("poolish_yeast") : t("biga_yeast"),
    pct: isPoolish ? t("poolish_pct") : t("biga_pct"),
    pctHelp: isPoolish ? t("poolish_pct_help") : t("biga_pct_help"),
  };

  /* ---------------- summaries for the collapsed accordion bars ------- */
  const sumStyle = `${t(cfg.labelKey)} · ${methodLabel}`;
  const sumFlour = `${flourLabel} · W${effectiveFlourW}`;
  const sumDough = `${flourGrams} g · ${clampedHydration}% · ${t("salt")} ${effectiveSalt.toFixed(1)}% · ${preview.ballsCount} × ${unitWeight} g`;
  const sumThermo = engine === "biga"
    ? `${t("thermo_biga_result")} ${calc.bigaWaterTemp.toFixed(1)}°C · ${t("thermo_refresh_result")} ${calc.refreshWaterTemp.toFixed(1)}°C`
    : `${t("thermo_direct_result")} ${calc.refreshWaterTemp.toFixed(1)}°C`;
  const sumMat = `${totalMaturationHours} h ${t("maturation_hours")}`;
  /** Injects the guided-assistant answers into the calculator state. */
  function applyWizard(r: WizardResult) {
    pendingHydr.current = r.hydration;
    setStyle(r.style);
    setMethod(r.engine === "biga" ? "indirect" : "direct");
    setPreFerment(r.preFerment);
    setHydr(r.hydration);
    if (r.flourId) setFlourId(r.flourId);
    setFlourW(r.flourW);
    setBigaKneadMode(r.bigaKneadMode);
    setKneadMode(r.kneadMode);
    setSimpleOven(r.simpleOven);
    setOvenMaxTemp(r.ovenMaxTempC);
    setTargetBake(r.targetBakeISO);
    setFlourGrams(r.flourAvailable);
    setTargetBallWeight(r.ballWeight);
    setNameEdited(false);
    toast.success(t("wiz_applied"));
  }

  const sumOven = `${t(SIMPLE_OVEN_LABEL_KEY[simpleOven])} · ${bt.voute[0]}–${bt.voute[1]}°C`;

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">{t("new_recipe_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("draft_autosave")}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Button type="button" size="sm" variant="secondary" onClick={() => setWizardOpen(true)}>
            <Wand2 className="size-4" />
            {t("wiz_open")}
          </Button>
          <SosDough />
        </div>
      </div>

      <RecipeWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onApply={applyWizard}
      />


      <Accordion type="multiple" defaultValue={["style", "dough"]} className="space-y-3">
        {/* ---------------- STYLE & METHOD ---------------- */}
        <Section id="style" icon={<Pizza className="size-4" />} title={t("acc_style")} summary={sumStyle}>
          <div className="grid grid-cols-2 gap-2">
            {PIZZA_STYLES.map((s) => {
              const c = STYLE_CONFIG[s];
              const active = s === style;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    active ? "border-primary bg-primary/10 shadow-md shadow-primary/20" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`text-xs font-bold leading-tight ${active ? "text-primary" : "text-foreground"}`}>{t(c.labelKey)}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug mt-1">{t(c.descKey)}</div>
                  <div className="text-[10px] tabular font-semibold mt-1.5 text-muted-foreground">{c.hydrMin}–{c.hydrMax}%</div>
                </button>
              );
            })}
          </div>

          {avpn.active && (
            <div className="rounded-lg border border-warning/40 p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-warning">{t("avpn_title")}</div>
              <p className="text-[11px] text-muted-foreground">{t("avpn_direct_only")}</p>
              <p className="text-[11px] text-muted-foreground">{t("avpn_no_fats")}</p>
              {clampedHydration > avpn.hydrMax && <Warning>{t("avpn_hydr_alert")}</Warning>}
            </div>
          )}

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("mixing_method")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ToggleBtn active={method === "direct"} onClick={() => setMethod("direct")}>{t("method_direct")}</ToggleBtn>
              <ToggleBtn active={method === "indirect"} onClick={() => cfg.allowIndirect && setMethod("indirect")} disabled={!cfg.allowIndirect}>
                {t("method_indirect")}
              </ToggleBtn>
            </div>
            {!cfg.allowIndirect && <p className="text-[11px] text-muted-foreground mt-2 italic">{t("method_direct_only")}</p>}
          </div>

          {method === "indirect" && (
            <div className="space-y-4 pt-2 border-t border-border/50">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preferment_type")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <ToggleBtn active={preFerment === "biga"} onClick={() => setPreFerment("biga")}>{t("preferment_biga")}</ToggleBtn>
                  <ToggleBtn active={preFerment === "poolish"} onClick={() => setPreFerment("poolish")}>{t("preferment_poolish")}</ToggleBtn>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{preLabels.pct}</Label>
                  <span className="tabular text-sm font-semibold text-primary">{bigaPct}%</span>
                </div>
                <Slider value={[bigaPct]} min={20} max={100} step={1} onValueChange={(v) => { bigaPctEdited.current = true; setBigaPct(v[0]); }} />
                <p className="text-[11px] text-muted-foreground leading-tight">{preLabels.pctHelp}</p>
              </div>

              {preFerment === "biga" && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("bferm_title")}</Label>
                  <div className="grid gap-2">
                    {(["ambient", "fridge", "mixed"] as BigaFermMode[]).map((m) => (
                      <ToggleBtn key={m} active={bigaFermMode === m} onClick={() => setBigaFermMode(m)}>{t(`bferm_${m}`)}</ToggleBtn>
                    ))}
                  </div>
                  {bigaFermMode !== "fridge" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-muted-foreground">{t("bferm_room")}</Label>
                        <span className="tabular text-sm font-semibold text-primary">{bigaRoomTemp}°C</span>
                      </div>
                      <Slider value={[bigaRoomTemp]} min={14} max={26} step={0.5} onValueChange={(v) => setBigaRoomTemp(v[0])} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-muted-foreground">{t("bferm_hours")}</Label>
                      <span className="tabular text-sm font-semibold text-primary">{bigaHours}h</span>
                    </div>
                    <Slider value={[bigaHours]} min={12} max={24} step={1} onValueChange={(v) => setBigaHours(v[0])} />
                  </div>
                  {(() => {
                    const pct = bigaYeastPctPro(bigaFermMode, bigaRoomTemp, bigaHours);
                    const perKg = (pct * 10) / (yeastType === "dry" ? 3 : 1);
                    return (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("bferm_dose")} · {yeastType === "dry" ? t("yeast_dry") : t("yeast_fresh")}</div>
                        <div className="tabular text-2xl font-bold text-primary mt-1">
                          {calc.bigaYeastShown.toFixed(1)}{t("grams")}
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            {(pct / (yeastType === "dry" ? 3 : 1)).toFixed(2)}% · {perKg.toFixed(1)}{t("grams")} {t("bferm_per_kg")}
                          </span>
                        </div>
                        <p className="text-[11px] text-warning mt-2 leading-snug">⚠️ {t("bferm_warn")}</p>
                      </div>
                    );
                  })()}
                  {clampedHydration > 70 && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm">{t("bferm_8020_toggle")}</Label>
                        <Switch checked={advise8020} onCheckedChange={setAdvise8020} />
                      </div>
                      {advise8020 && (
                        <>
                          <p className="text-[11px] text-muted-foreground">{t("bferm_8020_desc")}</p>
                          {bigaPct !== 80 && (
                            <ToggleBtn active={false} onClick={() => { bigaPctEdited.current = true; setBigaPct(80); }}>{t("bferm_8020_apply")}</ToggleBtn>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <LabelWithInfo label={t("biga_hydr_label")} info={t("info_biga_hydr")} />
                  </Label>
                  <span className="tabular text-sm font-semibold text-primary">{preFermentHydrPct}%</span>
                </div>
                {preFerment === "poolish" ? (
                  <p className="text-[11px] text-muted-foreground">{t("poolish_hydr_fixed")}</p>
                ) : (
                  <Slider value={[bigaHydr]} min={BIGA_HYDR_MIN} max={BIGA_HYDR_MAX} step={0.5} onValueChange={(v) => setBigaHydr(v[0])} />
                )}
                <p className="text-[11px] text-muted-foreground tabular">
                  {t("biga_water_formula")
                    .replace("{flour}", `${calc.bigaFlour.toFixed(1)}${t("grams")}`)
                    .replace("{pct}", String(preFermentHydrPct))
                    .replace("{water}", `${calc.bigaWater.toFixed(1)}${t("grams")}`)}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    <LabelWithInfo label={t("refresh_yeast_toggle")} info={t("info_refresh_yeast")} />
                  </Label>
                  <Switch checked={useRefreshYeast} onCheckedChange={setUseRefreshYeast} />
                </div>
                {useRefreshYeast && (
                  <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("refresh_yeast_pct")}</Label>
                      <span className="tabular text-sm font-semibold text-primary">{refreshYeastPct.toFixed(2)}%</span>
                    </div>
                    <Slider value={[refreshYeastPct]} min={0} max={0.3} step={0.01} onValueChange={(v) => setRefreshYeastPct(v[0])} />
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ---------------- FLOUR ---------------- */}
        <Section id="flour" icon={<Wheat className="size-4" />} title={t("acc_flour")} summary={sumFlour}>
          {/* Single flour — hidden/greyed while the blend is active */}
          {blend.enabled ? (
            <p className="text-[11px] text-muted-foreground italic rounded-lg border border-border/60 bg-secondary/20 p-3">
              {t("blend_single_hidden")}
            </p>
          ) : (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <LabelWithInfo label={t("flour_w")} info={t("info_flour_w")} />
              </Label>
              <FlourSelect value={flourId} onChange={(id, f) => { setFlourId(id); if (f) setFlourW(f.w); }} />
              <NumField label={t("flour_w")} value={flourW} onChange={(v) => { setFlourW(v); setFlourId(""); }} min={100} max={500} step={10} prefix="W" />
              <FlourRecoBlock flourW={flourW} />
              {(() => {
                const f = FLOURS.find((x) => x.id === flourId);
                if (!f) return null;
                const off = clampedHydration < f.hydrMin - 2 || clampedHydration > f.hydrMax + 2;
                return off ? (
                  <Warning>{t("flour_hydration_warn").replace("{min}", String(f.hydrMin)).replace("{max}", String(f.hydrMax))}</Warning>
                ) : null;
              })()}
              {effectiveFlourW < 220 && totalMaturationHours > maximumMaturationHours && (
                <Warning>{t("flour_long_ferm_warning")}</Warning>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                <LabelWithInfo label={t("flour_blend_toggle")} info={t("info_flour_blend")} />
              </Label>
              <Switch checked={blend.enabled} onCheckedChange={(v) => setBlend((b) => ({ ...b, enabled: v }))} />
            </div>
            {blend.enabled && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/30">
                <FlourSelect value={blend.flourAId} onChange={(id) => setBlend((b) => ({ ...b, flourAId: id }))} />
                <FlourSelect value={blend.flourBId} onChange={(id) => setBlend((b) => ({ ...b, flourBId: id }))} />
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("flour_blend_split")}</Label>
                  <span className="tabular text-sm font-semibold text-primary">{blend.ratioA}% / {100 - blend.ratioA}%</span>
                </div>
                <Slider value={[blend.ratioA]} min={0} max={100} step={5} onValueChange={(v) => setBlend((b) => ({ ...b, ratioA: v[0] }))} />
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 p-2">
                  <span className="text-[11px] text-muted-foreground">{t("flour_blend_w")}</span>
                  <span className="tabular text-sm font-bold text-primary">W{blendW(blend, flourW)}</span>
                </div>
              </div>
            )}
            <div className={`text-[11px] rounded-md p-2 border ${
              compat === "ideal" ? "border-primary/40 text-primary bg-primary/5"
              : compat === "caution" ? "border-warning/40 text-warning-foreground/90 bg-warning/5"
              : "border-destructive/40 text-destructive bg-destructive/5"
            }`}>
              {t("w_compat")}: {t(W_COMPAT_LABEL_KEY[compat])}
            </div>
          </div>
        </Section>

        {/* ---------------- DOUGH & INGREDIENTS ---------------- */}
        <Section id="dough" icon={<Scale />} title={t("acc_dough")} summary={sumDough}>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("flour_qty_title")}</Label>
            <NumField label={t("flour_qty_label")} value={flourGrams} onChange={(v) => setFlourGrams(Math.max(50, v))} min={50} step={50} suffix="g" />
            <p className="text-[11px] text-muted-foreground">{t("flour_qty_help")}</p>
          </div>

          {isTeglia && <TrayBlock trays={trays} setTrays={setTrays} />}

          {/* Ball preview calculator */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-primary">{t("preview_title")}</div>
            <NumField
              label={t("preview_ball_target")}
              value={targetBallWeight}
              onChange={(v) => setTargetBallWeight(Math.max(50, v))}
              min={50} step={5} suffix="g"
            />
            <p className="text-xs tabular leading-relaxed">
              {t("preview_result")
                .replace("{flour}", String(Math.round(flourGrams)))
                .replace("{balls}", String(preview.ballsCount))
                .replace("{weight}", String(unitWeight))
                .replace("{rest}", String(preview.remainder))}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField label={t("hydration")} value={clampedHydration} onChange={setHydr} min={cfg.hydrMin} max={hydrCeiling} step={0.5} suffix="%" />
            <NumField label={t("salt")} value={effectiveSalt} onChange={setSalt} min={0} max={5} step={0.1} suffix="%" />
          </div>
          <Slider value={[clampedHydration]} min={cfg.hydrMin} max={hydrCeiling} step={0.5} onValueChange={(v) => setHydr(v[0])} />
          <p className="text-[10px] text-muted-foreground tabular">
            {t("hydration_locked").replace("{min}", String(cfg.hydrMin)).replace("{max}", String(hydrCeiling))}
          </p>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("yeast_type")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ToggleBtn active={yeastType === "fresh"} onClick={() => setYeast("fresh")}>{t("yeast_fresh")}</ToggleBtn>
              <ToggleBtn active={yeastType === "dry"} onClick={() => setYeast("dry")}>{t("yeast_dry")}</ToggleBtn>
            </div>
          </div>

          {avpn.banOilAndMalt ? (
            <p className="text-[11px] text-muted-foreground italic">{t("avpn_no_fats")}</p>
          ) : (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <OptionalRow label={t("add_malt")} enabled={useMalt} onToggle={setUseMalt} value={maltPct} onValue={setMalt} min={0.5} max={1} step={0.1} suffix="%" fieldLabel={t("malt")} />
              <OptionalRow label={t("add_oil")} enabled={useOil} onToggle={setUseOil} value={oilPct} onValue={setOil} min={1} max={3} step={0.1} suffix="%" fieldLabel={t("oil")} />
            </div>
          )}
        </Section>

        {/* ---------------- WATER TEMPERATURES ---------------- */}
        <Section id="thermo" icon={<Droplets className="size-4" />} title={t("acc_thermo")} summary={sumThermo}>
          {engine === "biga" && (
            <div className="rounded-lg border border-border/60 p-3">
              <BigaWaterModule
                bare
                storageTemp={storageTemp}
                onStorageTemp={setStorageTemp}
                flourTemp={bigaFlourTemp}
                onFlourTemp={setBigaFlourTemp}
                mode={bigaKneadMode}
                onMode={setBigaKneadMode}
              />
            </div>
          )}
          <div className="rounded-lg border border-border/60 p-3">
            <RefreshWaterModule
              bare
              bigaTemp={engine === "biga" ? bigaRealTemp : undefined}
              onBigaTemp={setBigaRealTemp}
              flourTemp={refreshFlourTemp}
              onFlourTemp={setRefreshFlourTemp}
              ambientTemp={ambientTemp}
              onAmbientTemp={setAmbientTemp}
              mode={kneadMode}
              onMode={setKneadMode}
              friction={refreshFriction}
              onFriction={setRefreshFriction}
              autolysePenalty={autolysePenalty}
            />
          </div>
        </Section>

        {/* ---------------- MATURATION ---------------- */}
        <Section id="maturation" icon={<Snowflake className="size-4" />} title={t("acc_maturation")} summary={sumMat}>
          <MaturationPlanner
            bare
            plan={maturation}
            onChange={setMaturation}
            showPreferment={engine === "biga"}
            preFerment={preFerment}
            flourW={effectiveFlourW}
          />
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("target_bake")}</Label>
            <Input type="datetime-local" value={targetBake} onChange={(e) => setTargetBake(e.target.value)} className="tabular mt-1" />
          </div>
        </Section>

        {/* ---------------- OVEN ---------------- */}
        <Section id="oven" icon={<ChefHat className="size-4" />} title={t("acc_oven")} summary={sumOven}>
          <div className="grid grid-cols-2 gap-2">
            {SIMPLE_OVENS.map((o) => (
              <ToggleBtn key={o} active={simpleOven === o} onClick={() => setSimpleOven(o)}>
                {t(SIMPLE_OVEN_LABEL_KEY[o])}
              </ToggleBtn>
            ))}
          </div>
          <NumField label={t("oven_max_temp")} value={ovenMaxTemp} onChange={(v) => setOvenMaxTemp(Math.max(180, Math.min(550, v)))} min={180} max={550} step={5} suffix="°C" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={t("bake_voute")} value={`${bt.voute[0]}–${bt.voute[1]}°C`} />
            <Stat label={t("bake_sole")} value={`${bt.sole[0]}–${bt.sole[1]}°C`} />
          </div>
          {ovenCapped && <p className="text-[11px] text-muted-foreground">{t("oven_capped")}</p>}
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t(bt.tipKey)}</p>
          {bt.gearKey && <p className="text-[11px] text-muted-foreground italic">{t(bt.gearKey)}</p>}
        </Section>

        {/* ---------------- ADVANCED ---------------- */}
        <Section id="extras" icon={<Gauge className="size-4" />} title={t("acc_extras")} summary={`${t("tenacity_title")} ${tenacity} · ${t("autolyse_title")} ${autolyse.enabled ? autolyse.minutes + " " + t("minutes") : "—"}`}>
          <div className="space-y-3">
            <Label className="text-sm">
              <LabelWithInfo label={t("tenacity_title")} info={t("info_tenacity")} />
            </Label>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{t("tenacity_extensible")}</span>
              <span>{t("tenacity_balanced")}</span>
              <span>{t("tenacity_tenace")}</span>
            </div>
            <Slider value={[tenacity]} min={-100} max={100} step={5} onValueChange={(v) => setTenacity(v[0])} />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t(tenacityResult.noteKey).replace("{delta}", String(Math.abs(tenacityResult.saltDelta)))}
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                <span className="inline-flex items-center gap-1.5"><Sprout className="size-3.5 text-primary" />
                  <LabelWithInfo label={t("autolyse_title")} info={t("info_autolyse")} />
                </span>
              </Label>
              <Switch checked={autolyse.enabled} onCheckedChange={(v) => setAutolyse((a) => ({ ...a, enabled: v }))} />
            </div>
            {autolyse.enabled && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/30">
                <div className="grid grid-cols-2 gap-2">
                  <NumField label={t("autolyse_flour_pct")} value={autolyse.flourPct} onChange={(v) => setAutolyse((a) => ({ ...a, flourPct: v }))} min={30} max={100} step={5} suffix="%" />
                  <NumField label={t("autolyse_hydr_pct")} value={autolyse.hydrPct} onChange={(v) => setAutolyse((a) => ({ ...a, hydrPct: v }))} min={50} max={70} step={1} suffix="%" />
                </div>
                <NumField label={t("autolyse_duration")} value={autolyse.minutes} onChange={(v) => setAutolyse((a) => ({ ...a, minutes: v }))} min={20} max={240} step={5} suffix={t("minutes")} />
                <div className="grid grid-cols-2 gap-2">
                  <ToggleBtn active={autolyse.kind === "pure"} onClick={() => setAutolyse((a) => ({ ...a, kind: "pure" }))}>{t("autolyse_pure")}</ToggleBtn>
                  <ToggleBtn active={autolyse.kind === "fermentolyse"} onClick={() => setAutolyse((a) => ({ ...a, kind: "fermentolyse" }))}>{t("autolyse_fermentolyse")}</ToggleBtn>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label={t("autolyse_flour_weight")} value={`${autolyseResult.flour.toFixed(0)}${t("grams")}`} />
                  <Stat label={t("autolyse_water_weight")} value={`${autolyseResult.water.toFixed(0)}${t("grams")}`} />
                </div>
                {autolyseResult.warnings.map((w) => <Warning key={w}>{t(w)}</Warning>)}
              </div>
            )}
          </div>
        </Section>
      </Accordion>

      {/* ---------------- OVERVIEW ---------------- */}
      <Card className="p-4 space-y-3 mt-4">
        <SectionTitle icon={<Thermometer className="size-4" />} title={t("overview")} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={t("total_dough")} value={`${calc.totalDough.toFixed(0)}${t("grams")}`} strong />
          <Stat label={t("total_flour")} value={`${calc.totalFlour.toFixed(0)}${t("grams")}`} />
          <Stat label={t("total_water")} value={`${calc.totalWater.toFixed(1)}${t("grams")}`} />
          <Stat label={t("total_salt")} value={`${calc.totalSalt.toFixed(1)}${t("grams")}`} />
        </div>

        {engine === "biga" ? (
          <>
            <MiniHeader>{preLabels.phase} · {bigaPct}%</MiniHeader>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label={preLabels.flour} value={`${calc.bigaFlour.toFixed(1)}${t("grams")}`} />
              <Stat label={`${preLabels.water} (${preFermentHydrPct}%)`} value={`${calc.bigaWater.toFixed(1)}${t("grams")}`} />
              <Stat label={preLabels.yeast} value={`${yeastShown.toFixed(2)}${t("grams")}`} highlight />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label={t("thermo_biga_result")} value={`${calc.bigaWaterTemp.toFixed(1)}°C`} />
              <Stat label={t("thermo_refresh_result")} value={`${calc.refreshWaterTemp.toFixed(1)}°C`} />
            </div>
            <MiniHeader>{t("refresh_phase")}</MiniHeader>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label={`${t("refresh_flour_dyn")} (${100 - bigaPct}%)`} value={`${calc.refreshFlour.toFixed(1)}${t("grams")}`} />
              <Stat label={t("refresh_water")} value={`${calc.refreshWater.toFixed(1)}${t("grams")}`} />
              <Stat label={t("refresh_salt")} value={`${calc.totalSalt.toFixed(1)}${t("grams")}`} />
              {useRefreshYeast && refreshYeastPct > 0 && (
                <Stat label={t("refresh_yeast_label")} value={`${calc.refreshYeastShown.toFixed(2)}${t("grams")}`} highlight />
              )}
            </div>
          </>
        ) : (
          <>
            <MiniHeader>{t("engine_direct")}</MiniHeader>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label={t("biga_yeast")} value={`${yeastShown.toFixed(3)}${t("grams")}`} highlight />
              <Stat label={t("thermo_direct_result")} value={`${calc.refreshWaterTemp.toFixed(1)}°C`} />
            </div>
          </>
        )}
      </Card>

      {/* ---------------- SAVE ---------------- */}
      <Card className="p-4 space-y-3 mt-4 sticky bottom-20 sm:relative sm:bottom-auto border-primary/30 bg-card/95 backdrop-blur">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("name_auto_label")}</Label>
          <div className="flex gap-2 mt-1">
            <Input value={name} onChange={(e) => { setName(e.target.value); setNameEdited(true); }} />
            <Button variant="outline" size="icon" aria-label={t("name_reset_auto")} onClick={() => { setNameEdited(false); setName(autoName); }}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
        {!user && <Warning>{t("auth_required")}</Warning>}
        <Button size="lg" className="w-full h-12 font-semibold" onClick={save} disabled={saving}>
          <Save className="size-4 mr-2" /> {saving ? "…" : t("save_recipe")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => { localStorage.removeItem(DRAFT_KEY); toast.success(t("draft_cleared")); }}
        >
          <Trash2 className="size-3.5 mr-2" /> {t("draft_clear")}
        </Button>
      </Card>
    </AppShell>
  );
}

/* ---- UI helpers ---- */

function Section({
  id, icon, title, summary, children,
}: { id: string; icon: React.ReactNode; title: string; summary: string; children: React.ReactNode }) {
  return (
    <Card className="px-4 py-0 overflow-hidden">
      <AccordionItem value={id} className="border-b-0">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-primary shrink-0">{icon}</span>
            <div className="min-w-0">
              <div className="font-display font-semibold text-sm text-left">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate text-left tabular">{summary}</div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">{children}</AccordionContent>
      </AccordionItem>
    </Card>
  );
}

function Scale(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M16 16.5V21m-8-4.5V21M12 2v14"/><path d="M4 21h16"/><circle cx="6" cy="10" r="3"/><circle cx="18" cy="10" r="3"/></svg>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h3 className="font-display font-semibold text-sm">{title}</h3>
    </div>
  );
}

function NumField({
  label, value, onChange, min, max, step = 1, suffix, prefix,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; prefix?: string;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative mt-1">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">{prefix}</span>}
        <NumberInput
          value={value}
          onChange={onChange}
          min={min} max={max} step={step}
          className={`tabular ${prefix ? "pl-8" : ""} ${suffix ? "pr-9" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">{suffix}</span>}
      </div>

    </div>
  );
}

function ToggleBtn({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-10 rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors ${
        disabled
          ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
          : active
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start rounded-lg border border-warning/40 bg-warning/5 p-3">
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <p className="text-xs text-warning-foreground/90 leading-relaxed">{children}</p>
    </div>
  );
}

function OptionalRow({
  label, enabled, onToggle, value, onValue, min, max, step, suffix, fieldLabel,
}: {
  label: string; enabled: boolean; onToggle: (v: boolean) => void;
  value: number; onValue: (v: number) => void;
  min: number; max: number; step: number; suffix: string; fieldLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="pl-2 border-l-2 border-primary/30 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{fieldLabel}</span>
            <span className="tabular font-semibold text-primary">{value.toFixed(1)}{suffix}</span>
          </div>
          <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onValue(v[0])} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, highlight }: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/30"}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
      <div className={`tabular mt-0.5 ${strong ? "text-base font-bold" : highlight ? "text-sm font-semibold text-primary" : "text-sm font-semibold"}`}>
        {value}
      </div>
    </div>
  );
}

function MiniHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-primary/80 font-bold pt-2">{children}</div>;
}

function FlourRecoBlock({ flourW }: { flourW: number }) {
  const { t } = useI18n();
  const cat = flourCategory(flourW);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Wheat className="size-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{t(cat.key)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cat.recos.map((r) => (
          <span key={r} className="text-[11px] px-2 py-0.5 rounded border border-border/60 bg-card tabular">{r}</span>
        ))}
      </div>
    </div>
  );
}

function TrayBlock({ trays, setTrays }: { trays: TrayConfig; setTrays: (t: TrayConfig) => void }) {
  const { t } = useI18n();
  const weight = doughPerTray(trays.lengthCm, trays.widthCm, trays.coef);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("tray_size")}</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {TRAY_PRESETS.map((p) => (
            <ToggleBtn
              key={p.label}
              active={trays.lengthCm === p.l && trays.widthCm === p.wcm}
              onClick={() => setTrays({ ...trays, lengthCm: p.l, widthCm: p.wcm })}
            >
              {p.label}
            </ToggleBtn>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumField label={t("tray_length")} value={trays.lengthCm} onChange={(v) => setTrays({ ...trays, lengthCm: v })} min={10} step={1} suffix="cm" />
        <NumField label={t("tray_width")} value={trays.widthCm} onChange={(v) => setTrays({ ...trays, widthCm: v })} min={10} step={1} suffix="cm" />
      </div>
      <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("tray_dough")}</span>
          <span className="tabular font-bold text-primary">{weight}g</span>
        </div>
      </div>
    </div>
  );
}
