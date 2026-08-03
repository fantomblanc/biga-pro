import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { WaterTempPro } from "@/components/WaterTempPro";
import { FlourSelect } from "@/components/FlourSelect";
import { MaturationAdvisor } from "@/components/MaturationAdvisor";
import { LabelWithInfo } from "@/components/InfoTip";
import { FLOURS } from "@/lib/flours";
import {
  calculateRecipe,
  buildTimeline,
  clampHydrationToStyle,
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
} from "@/lib/dough-engine";
import {
  OVEN_TYPES,
  OVEN_LABEL_KEY,
  type OvenType,
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
  PREFERMENT_LOCATIONS,
  PREFERMENT_LOCATION_LABEL_KEY,
  prefermentProfile,
  type PrefermentLocation,
  doughPerTray,
  TRAY_PRESETS,
  avpnRules,
  scaleFromFlour,
  type MixerType,
} from "@/lib/dough-pro";
import { setActiveId } from "@/lib/storage";
import { saveRecipe } from "@/lib/cloud";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AlertTriangle, Save, Flame, Pizza, Wheat, Gauge, Layers, Thermometer, ChefHat, Sprout } from "lucide-react";



export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Recipe · CarpiBiga Pro" },
      { name: "description", content: "Guided pizza-style wizard: choose style, method, pre-ferment. Locked hydration ranges and pro fermentation timing." },
    ],
  }),
  component: NewRecipePage,
});

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


  // Wizard state
  const [style, setStyle] = useState<PizzaStyle>("contemporanea");
  const [method, setMethod] = useState<"direct" | "indirect">("indirect");
  const [preFerment, setPreFerment] = useState<PreFermentType>("biga");

  const [name, setName] = useState("");
  const [ballsCount, setBalls] = useState(6);
  const [ballWeight, setBallW] = useState(260);
  const [hydration, setHydr] = useState(styleMidpoint("contemporanea"));
  const [saltPct, setSalt] = useState(2.5);
  const [yeastType, setYeast] = useState<YeastType>("fresh");
  const [flourW, setFlourW] = useState(340);
  const [flourId, setFlourId] = useState<string>("");

  const [useMalt, setUseMalt] = useState(false);
  const [maltPct, setMalt] = useState(1);
  const [useOil, setUseOil] = useState(false);
  const [oilPct, setOil] = useState(2);
  const [cellarTemp, setCellar] = useState(18);
  const [bigaPct, setBigaPct] = useState(80);
  const [targetBake, setTargetBake] = useState(defaultBakeISO());

  // --- Professional extensions ---
  const [tenacity, setTenacity] = useState(0);
  const [blend, setBlend] = useState<FlourBlend>({ enabled: false, flourAId: "", flourBId: "", ratioA: 50 });
  const [autolyse, setAutolyse] = useState<AutolyseConfig>(DEFAULT_AUTOLYSE);
  const [prefermentLoc, setPrefermentLoc] = useState<PrefermentLocation>("cellar");
  const [ovenType, setOvenType] = useState<OvenType>("domestic");
  const [trays, setTrays] = useState<TrayConfig>({ count: 2, lengthCm: 40, widthCm: 30, coef: 0.6 });
  const [mixer, setMixer] = useState<MixerType>("hand");
  const [flourTemp, setFlourTemp] = useState(20);
  const [ambientTemp, setAmbientTemp] = useState(22);
  const [useFlourAvailable, setUseFlourAvailable] = useState(false);
  const [flourAvailable, setFlourAvailable] = useState(1000);
  /** Biga hydration, 44–50% (45% standard). Poolish stays at 100%. */
  const [bigaHydr, setBigaHydr] = useState(BIGA_HYDR_DEFAULT);
  const [useRefreshYeast, setUseRefreshYeast] = useState(false);
  const [refreshYeastPct, setRefreshYeastPct] = useState(0.1);


  const cfg = STYLE_CONFIG[style];
  const isTeglia = style === "teglia";
  const avpn = avpnRules(style);

  // When style changes: snap hydration to midpoint, force direct if style disallows indirect.
  useEffect(() => {
    setHydr(styleMidpoint(style));
    if (!cfg.allowIndirect && method !== "direct") setMethod("direct");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  // When switching to poolish, default pct to 30 (typical poolish share). When to biga, restore 80.
  useEffect(() => {
    if (method !== "indirect") return;
    setBigaPct(preFerment === "poolish" ? 30 : 80);
  }, [preFerment, method]);

  // Pre-ferment maturation location drives its default temperature.
  useEffect(() => {
    if (method !== "indirect") return;
    setCellar(prefermentProfile(prefermentLoc, preFerment).tempC);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefermentLoc, preFerment, method]);

  // AVPN: strict Napoletana disables malt/oil.
  useEffect(() => {
    if (avpn.banOilAndMalt) { setUseMalt(false); setUseOil(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avpn.banOilAndMalt]);

  // Derived engine: indirect → "biga" engine (with either biga or poolish pre-ferment).
  const engine: EngineType = method === "indirect" ? "biga" : "direct";

  // Dynamic hydration ceiling (85% unlock for Biga/Canotto/Teglia; AVPN stays capped).
  const hydrCeiling = hydrationCeiling(style, engine === "biga", bigaPct);
  const clampedHydration = clampHydrationPro(hydration, style, engine === "biga", bigaPct);

  // Effective flour strength: manual W or two-flour blend average.
  const effectiveFlourW = blend.enabled ? blendW(blend, flourW) : flourW;
  const compat = wCompat(effectiveFlourW, engine === "biga", clampedHydration, style);

  // Tenacity/extensibility arbitration: adjusts salt and bulk rest, never hydration.
  const tenacityResult = tenacityAdjust(tenacity, saltPct, clampedHydration);
  const effectiveSalt = avpn.active
    ? Math.min(avpn.saltMax, Math.max(avpn.saltMin, tenacityResult.saltPct))
    : tenacityResult.saltPct;

  const preFermentProfileVal = prefermentProfile(prefermentLoc, preFerment);

  // Teglia: tray count/size drives "balls" (trays) and per-unit weight.
  const trayWeight = doughPerTray(trays.lengthCm, trays.widthCm, trays.coef);
  const effectiveBallsCount = isTeglia ? trays.count : ballsCount;
  const effectiveBallWeight = isTeglia ? trayWeight : ballWeight;

  // Autolyse penalty on water temperature.
  const autolyseResult = useMemo(
    () => computeAutolyse(autolyse, effectiveBallsCount * effectiveBallWeight / (1 + clampedHydration / 100 + effectiveSalt / 100), 0, effectiveFlourW),
    [autolyse, effectiveBallsCount, effectiveBallWeight, clampedHydration, effectiveSalt, effectiveFlourW],
  );

  // Scale by available flour (reverse mode).
  const flourScale = useFlourAvailable
    ? scaleFromFlour({
        availableFlour: flourAvailable,
        hydration: clampedHydration,
        saltPct: effectiveSalt,
        maltPct: useMalt ? maltPct : 0,
        oilPct: useOil ? oilPct : 0,
        unitWeight: effectiveBallWeight,
      })
    : null;

  const finalBallsCount = flourScale ? flourScale.ballsCount : effectiveBallsCount;

  const bulkFactorMin = engine === "direct" ? Math.round(30 * tenacityResult.bulkFactor) : undefined;

  const inputs: RecipeInputs = useMemo(() => ({
    engine, ballsCount: finalBallsCount, ballWeight: effectiveBallWeight, hydration: clampedHydration,
    saltPct: effectiveSalt, yeastType, flourW: effectiveFlourW,
    useMalt: avpn.banOilAndMalt ? false : useMalt, maltPct, useOil: avpn.banOilAndMalt ? false : useOil, oilPct, cellarTemp, bigaPct,
    style, preFerment: engine === "biga" ? preFerment : undefined,
    targetBakeISO: new Date(targetBake).toISOString(),
    ovenType, tenacity, autolyse, blend,
    prefermentLoc: engine === "biga" ? prefermentLoc : undefined,
    preFermentHydrPct: engine === "biga" ? preFermentProfileVal.bigaHydrPct : undefined,
    trays: isTeglia ? trays : undefined,
    mixer, flourTemp, targetDoughTemp, waterTempSuggested,
    bulkOverrideMin: bulkFactorMin,
    flourAvailable: useFlourAvailable ? flourAvailable : undefined,
  }), [engine, finalBallsCount, effectiveBallWeight, clampedHydration, effectiveSalt, yeastType, effectiveFlourW,
      useMalt, maltPct, useOil, oilPct, cellarTemp, bigaPct, style, preFerment, targetBake, ovenType, tenacity,
      autolyse, blend, prefermentLoc, preFermentProfileVal, isTeglia, trays, mixer, flourTemp, targetDoughTemp,
      waterTempSuggested, bulkFactorMin, useFlourAvailable, flourAvailable, avpn.banOilAndMalt]);

  const calc = useMemo(() => calculateRecipe(inputs), [inputs]);
  const finalProofH = 3.5;
  const timeline = useMemo(() => buildTimeline(inputs, finalProofH), [inputs]);

  // Oven-aware bake targets override the base engine's generic bake bands.
  const bt = bakeTargets(style, ovenType, engine, clampedHydration);
  const adjustedCalc = useMemo(() => ({
    ...calc,
    bakeVoute: bt.voute,
    bakeSole: bt.sole,
    bakeTipKey: bt.tipKey,
  }), [calc, bt]);

  const [saving, setSaving] = useState(false);

  async function save(loadAsActive: boolean) {
    if (!user) {
      toast.error(t("auth_required"));
      navigate({ to: "/auth" });
      return;
    }
    const id = crypto.randomUUID();
    const styleLabel = t(cfg.labelKey);
    const finalName = name.trim() || `${styleLabel} ${clampedHydration}%`;
    setSaving(true);
    try {
      const saved = await saveRecipe({
        id,
        name: finalName,
        createdAt: new Date().toISOString(),
        inputs,
        calc: adjustedCalc,
        timeline,
        finalProofH,
        notes: "",
        photos: [],
      });
      if (loadAsActive) setActiveId(saved.id);
      toast.success(t("recipe_saved"));
      navigate({ to: "/recipe/$id", params: { id: saved.id } });
    } catch (e) {
      console.error(e);
      toast.error(t("cloud_error"));
    } finally {
      setSaving(false);
    }
  }


  const yeastFresh = engine === "biga" ? calc.bigaYeastFresh : calc.directYeastFresh;
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

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">{t("new_recipe_title")}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t("tagline")}</p>

      <div className="space-y-4">
        {/* STEP 1 — Pizza Style */}
        <Card className="p-4">
          <SectionTitle icon={<Pizza className="size-4" />} title={t("style")} />
          <p className="text-[11px] text-muted-foreground mt-1 mb-3">{t("style_help")}</p>
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
                    active
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`text-xs font-bold leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                    {t(c.labelKey)}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-snug mt-1">{t(c.descKey)}</div>
                  <div className="text-[10px] tabular font-semibold mt-1.5" style={{ color: active ? undefined : "var(--muted-foreground)" }}>
                    {c.hydrMin}–{c.hydrMax}%
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* AVPN strict rules for traditional Napoletana */}
        {avpn.active && (
          <Card className="p-4 space-y-1.5 border-warning/40">
            <SectionTitle icon={<AlertTriangle className="size-4" />} title={t("avpn_title")} />
            <p className="text-[11px] text-muted-foreground">{t("avpn_direct_only")}</p>
            <p className="text-[11px] text-muted-foreground">{t("avpn_no_fats")}</p>
            <p className="text-[11px] text-muted-foreground">{t("avpn_hydr")}</p>
            <p className="text-[11px] text-muted-foreground">{t("avpn_salt")}</p>
            {clampedHydration > avpn.hydrMax && <Warning>{t("avpn_hydr_alert")}</Warning>}
          </Card>
        )}

        {/* STEP 2 — Mixing Method */}
        <Card className="p-4">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("mixing_method")}</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <ToggleBtn active={method === "direct"} onClick={() => setMethod("direct")}>
              {t("method_direct")}
            </ToggleBtn>
            <ToggleBtn
              active={method === "indirect"}
              onClick={() => cfg.allowIndirect && setMethod("indirect")}
              disabled={!cfg.allowIndirect}
            >
              {t("method_indirect")}
            </ToggleBtn>
          </div>
          {!cfg.allowIndirect && (
            <p className="text-[11px] text-muted-foreground mt-2 italic">{t("method_direct_only")}</p>
          )}
          {method === "indirect" && (
            <p className="text-[11px] text-muted-foreground mt-2">{t("method_indirect_desc")}</p>
          )}
        </Card>

        {/* STEP 3 — Pre-ferment (only if indirect) */}
        {method === "indirect" && (
          <Card className="p-4">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preferment_type")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ToggleBtn active={preFerment === "biga"} onClick={() => setPreFerment("biga")}>
                {t("preferment_biga")}
              </ToggleBtn>
              <ToggleBtn active={preFerment === "poolish"} onClick={() => setPreFerment("poolish")}>
                {t("preferment_poolish")}
              </ToggleBtn>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{preLabels.pct}</Label>
                <span className="tabular text-sm font-semibold text-primary">{bigaPct}%</span>
              </div>
              <Slider
                value={[bigaPct]}
                min={20}
                max={100}
                step={1}
                onValueChange={(v) => setBigaPct(v[0])}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={bigaPct}
                  min={20}
                  max={100}
                  step={1}
                  onChange={(e) => setBigaPct(Math.min(100, Math.max(20, Number(e.target.value) || 0)))}
                  className="tabular h-9 w-24"
                />
                <p className="text-[11px] text-muted-foreground leading-tight">{preLabels.pctHelp}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <LabelWithInfo label={t("preferment_loc")} info={t("info_preferment_loc")} />
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PREFERMENT_LOCATIONS.map((loc) => (
                  <ToggleBtn key={loc} active={prefermentLoc === loc} onClick={() => setPrefermentLoc(loc)}>
                    {t(PREFERMENT_LOCATION_LABEL_KEY[loc])}
                  </ToggleBtn>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(prefermentProfile(prefermentLoc, preFerment).descKey)}
              </p>
              <p className="text-[10px] text-muted-foreground tabular">
                {t("preferment_loc_hydr").replace("{pct}", String(preFermentProfileVal.bigaHydrPct))}
              </p>
            </div>
          </Card>
        )}

        {/* Ingredients */}
        <Card className="p-4 space-y-4">
          <SectionTitle icon={<Scale />} title={t("ingredients")} />

          {isTeglia ? (
            <TrayBlock trays={trays} setTrays={setTrays} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumField label={t("balls_count")} value={ballsCount} onChange={setBalls} min={1} />
              <NumField label={t("ball_weight")} value={ballWeight} onChange={setBallW} min={50} step={5} suffix="g" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <NumField
              label={t("hydration")}
              value={clampedHydration}
              onChange={(v) => setHydr(v)}
              min={cfg.hydrMin}
              max={hydrCeiling}
              step={0.5}
              suffix="%"
            />
            <NumField label={t("salt")} value={effectiveSalt} onChange={setSalt} min={0} max={5} step={0.1} suffix="%" />
          </div>
          <div className="space-y-2">
            <LabelWithInfo label="" info={t("info_hydration")} className="sr-only" />
            <Slider
              value={[clampedHydration]}
              min={cfg.hydrMin}
              max={hydrCeiling}
              step={0.5}
              onValueChange={(v) => setHydr(v[0])}
            />
            <p className="text-[10px] text-muted-foreground tabular">
              {t("hydration_locked").replace("{min}", String(cfg.hydrMin)).replace("{max}", String(hydrCeiling))}
            </p>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("yeast_type")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ToggleBtn active={yeastType === "fresh"} onClick={() => setYeast("fresh")}>{t("yeast_fresh")}</ToggleBtn>
              <ToggleBtn active={yeastType === "dry"} onClick={() => setYeast("dry")}>{t("yeast_dry")}</ToggleBtn>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <LabelWithInfo label={t("flour_w")} info={t("info_flour_w")} />
            </Label>
          </div>
          <FlourSelect
            value={flourId}
            onChange={(id, f) => { setFlourId(id); if (f) setFlourW(f.w); }}
          />
          <NumField label={t("flour_w")} value={flourW} onChange={(v) => { setFlourW(v); setFlourId(""); }} min={100} max={500} step={10} prefix="W" />
          <FlourRecoBlock flourW={flourW} />
          {(() => {
            const f = FLOURS.find((x) => x.id === flourId);
            if (!f) return null;
            const off = clampedHydration < f.hydrMin - 2 || clampedHydration > f.hydrMax + 2;
            return off ? (
              <Warning>
                {t("flour_hydration_warn")
                  .replace("{min}", String(f.hydrMin))
                  .replace("{max}", String(f.hydrMax))}
              </Warning>
            ) : null;
          })()}
          {calc.flourWarning && <Warning>{t("flour_w_warning")}</Warning>}
          {flourW < 220 && <Warning>{t("flour_long_ferm_warning")}</Warning>}

          {/* Flour blending */}
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
                <div className={`text-[11px] rounded-md p-2 border ${
                  compat === "ideal" ? "border-primary/40 text-primary bg-primary/5"
                  : compat === "caution" ? "border-warning/40 text-warning-foreground/90 bg-warning/5"
                  : "border-destructive/40 text-destructive bg-destructive/5"
                }`}>
                  {t("w_compat")}: {t(W_COMPAT_LABEL_KEY[compat])}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            {avpn.banOilAndMalt ? (
              <p className="text-[11px] text-muted-foreground italic">{t("avpn_no_fats")}</p>
            ) : (
              <>
                <OptionalRow
                  label={t("add_malt")} enabled={useMalt} onToggle={setUseMalt}
                  value={maltPct} onValue={setMalt} min={0.5} max={1} step={0.1} suffix="%"
                  fieldLabel={t("malt")}
                />
                <OptionalRow
                  label={t("add_oil")} enabled={useOil} onToggle={setUseOil}
                  value={oilPct} onValue={setOil} min={1} max={3} step={0.1} suffix="%"
                  fieldLabel={t("oil")}
                />
              </>
            )}
          </div>
        </Card>

        {/* Tenacity / extensibility */}
        <Card className="p-4 space-y-3">
          <SectionTitle icon={<Gauge className="size-4" />} title={
            <LabelWithInfo label={t("tenacity_title")} info={t("info_tenacity")} />
          } />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{t("tenacity_extensible")}</span>
            <span>{t("tenacity_balanced")}</span>
            <span>{t("tenacity_tenace")}</span>
          </div>
          <Slider value={[tenacity]} min={-100} max={100} step={5} onValueChange={(v) => setTenacity(v[0])} />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t(tenacityResult.noteKey).replace("{delta}", String(Math.abs(tenacityResult.saltDelta)))}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <span className="text-muted-foreground">{t("tenacity_salt_applied").replace("{salt}", effectiveSalt.toFixed(2))}</span>
            {bulkFactorMin !== undefined && (
              <span className="text-muted-foreground">{t("tenacity_bulk_applied").replace("{min}", String(bulkFactorMin))}</span>
            )}
          </div>
        </Card>

        {/* Autolyse */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle icon={<Sprout className="size-4" />} title={
              <LabelWithInfo label={t("autolyse_title")} info={t("info_autolyse")} />
            } />
            <Switch checked={autolyse.enabled} onCheckedChange={(v) => setAutolyse((a) => ({ ...a, enabled: v }))} />
          </div>
          {autolyse.enabled && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/30">
              <div className="grid grid-cols-2 gap-2">
                <NumField label={t("autolyse_flour_pct")} value={autolyse.flourPct} onChange={(v) => setAutolyse((a) => ({ ...a, flourPct: v }))} min={30} max={100} step={5} suffix="%" />
                <NumField label={t("autolyse_hydr_pct")} value={autolyse.hydrPct} onChange={(v) => setAutolyse((a) => ({ ...a, hydrPct: v }))} min={50} max={70} step={1} suffix="%" />
              </div>
              <NumField label={t("autolyse_duration")} value={autolyse.minutes} onChange={(v) => setAutolyse((a) => ({ ...a, minutes: v }))} min={20} max={240} step={5} suffix={t("minutes")} />
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("autolyse_kind")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <ToggleBtn active={autolyse.kind === "pure"} onClick={() => setAutolyse((a) => ({ ...a, kind: "pure" }))}>{t("autolyse_pure")}</ToggleBtn>
                  <ToggleBtn active={autolyse.kind === "fermentolyse"} onClick={() => setAutolyse((a) => ({ ...a, kind: "fermentolyse" }))}>{t("autolyse_fermentolyse")}</ToggleBtn>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label={t("autolyse_flour_weight")} value={`${autolyseResult.flour.toFixed(0)}${t("grams")}`} />
                <Stat label={t("autolyse_water_weight")} value={`${autolyseResult.water.toFixed(0)}${t("grams")}`} />
              </div>
              {autolyseResult.warnings.map((w) => <Warning key={w}>{t(w)}</Warning>)}
              {autolyseResult.tips.map((tip) => (
                <p key={tip} className="text-[11px] text-muted-foreground italic">{t(tip)}</p>
              ))}
              {autolyseResult.waterTempPenalty > 0 && (
                <p className="text-[11px] text-muted-foreground">{t("autolyse_temp_penalty")}</p>
              )}
            </div>
          )}
        </Card>

        {/* Environment */}
        <Card className="p-4 space-y-4">
          <SectionTitle icon={<Flame />} title={engine === "biga" ? t("cellar_temp") : t("room_temp_label")} />
          <NumField
            label={engine === "biga" ? t("cellar_temp") : t("room_temp_label")}
            value={cellarTemp} onChange={setCellar}
            min={4} max={30} step={0.5} suffix="°C"
          />
          {engine === "biga" && calc.cellarWarning && <Warning>{t("cellar_temp_warning")}</Warning>}
          {engine === "direct" && <p className="text-[11px] text-muted-foreground leading-relaxed">{t("room_temp_warning")}</p>}
          {engine === "direct" && calc.bulkTooHot && <Warning>{t("bulk_hot_warning")}</Warning>}

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("target_bake")}</Label>
            <Input
              type="datetime-local"
              value={targetBake}
              onChange={(e) => setTargetBake(e.target.value)}
              className="tabular mt-1"
            />
          </div>
        </Card>

        {/* Oven type */}
        <Card className="p-4 space-y-3">
          <SectionTitle icon={<ChefHat className="size-4" />} title={
            <LabelWithInfo label={t("oven_title")} info={t("info_oven")} />
          } />
          <div className="grid grid-cols-3 gap-2">
            {OVEN_TYPES.map((o) => (
              <ToggleBtn key={o} active={ovenType === o} onClick={() => setOvenType(o)}>
                {t(OVEN_LABEL_KEY[o])}
              </ToggleBtn>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={t("bake_voute")} value={`${bt.voute[0]}–${bt.voute[1]}°C`} />
            <Stat label={t("bake_sole")} value={`${bt.sole[0]}–${bt.sole[1]}°C`} />
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t(bt.tipKey)}</p>
          {bt.gearKey && <p className="text-[11px] text-muted-foreground italic">{t(bt.gearKey)}</p>}
        </Card>

        {/* Scale by available flour */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              <LabelWithInfo label={t("flour_available_toggle")} info={t("info_flour_available")} />
            </Label>
            <Switch checked={useFlourAvailable} onCheckedChange={setUseFlourAvailable} />
          </div>
          {useFlourAvailable && (
            <div className="space-y-2 pl-2 border-l-2 border-primary/30">
              <NumField label={t("flour_available_label")} value={flourAvailable} onChange={setFlourAvailable} min={100} step={50} suffix="g" />
              {flourScale && (
                <p className="text-xs text-muted-foreground tabular">
                  {t(isTeglia ? "flour_available_result_trays" : "flour_available_result")
                    .replace("{dough}", `${flourScale.totalDough.toFixed(0)}${t("grams")}`)
                    .replace("{balls}", String(flourScale.ballsCount))
                    .replace("{exact}", flourScale.ballsExact.toFixed(2))}
                </p>
              )}
            </div>
          )}
        </Card>

        <MaturationAdvisor flourW={effectiveFlourW} />

        <WaterTempPro
          defaultRoom={cellarTemp}
          defaultFlour={flourTemp}
          defaultTarget={targetDoughTemp}
          autolysePenalty={autolyse.enabled ? autolyseResult.waterTempPenalty : 0}
          onResult={(temp, opts) => {
            if (temp !== waterTempSuggested) setWaterTempSuggested(temp);
            if (opts.mixer !== mixer) setMixer(opts.mixer);
            if (opts.flour !== flourTemp) setFlourTemp(opts.flour);
            if (opts.target !== targetDoughTemp) setTargetDoughTemp(opts.target);
          }}
        />


        {/* Live preview */}
        <Card className="p-4 space-y-3">
          <SectionTitle icon={<Scale />} title={t("overview")} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Stat label={t("total_dough")} value={`${calc.totalDough.toFixed(0)}${t("grams")}`} strong />
            <Stat label={t("total_flour")} value={`${calc.totalFlour.toFixed(1)}${t("grams")}`} />
            <Stat label={t("total_water")} value={`${calc.totalWater.toFixed(1)}${t("grams")}`} />
            <Stat label={t("total_salt")} value={`${calc.totalSalt.toFixed(1)}${t("grams")}`} />
          </div>

          {engine === "biga" ? (
            <>
              <MiniHeader>{preLabels.phase} · {bigaPct}%</MiniHeader>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label={`${preLabels.flour} (${bigaPct}%)`} value={`${calc.bigaFlour.toFixed(1)}${t("grams")}`} />
                <Stat label={preLabels.water} value={`${calc.bigaWater.toFixed(1)}${t("grams")}`} />
                <Stat label={preLabels.yeast} value={`${yeastShown.toFixed(2)}${t("grams")}`} highlight />
              </div>
              <MiniHeader>{t("refresh_phase")}</MiniHeader>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label={`${t("refresh_flour_dyn")} (${(100 - bigaPct)}%)`} value={`${calc.refreshFlour.toFixed(1)}${t("grams")}`} />
                <Stat label={t("refresh_water")} value={`${calc.refreshWater.toFixed(1)}${t("grams")}`} />
                <Stat label={t("refresh_salt")} value={`${calc.totalSalt.toFixed(1)}${t("grams")}`} />
                {useMalt && <Stat label={t("refresh_malt")} value={`${calc.totalMalt.toFixed(2)}${t("grams")}`} />}
                {useOil && <Stat label={t("refresh_oil")} value={`${calc.totalOil.toFixed(1)}${t("grams")}`} />}
              </div>
            </>
          ) : (
            <>
              <MiniHeader>{t("engine_direct")}</MiniHeader>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label={t("biga_yeast")} value={`${yeastShown.toFixed(3)}${t("grams")}`} highlight />
                <Stat label={t("bulk_ferment")} value={`${calc.bulkFermentMin} ${t("minutes")}`} />
                {useMalt && <Stat label={t("refresh_malt")} value={`${calc.totalMalt.toFixed(2)}${t("grams")}`} />}
                {useOil && <Stat label={t("refresh_oil")} value={`${calc.totalOil.toFixed(1)}${t("grams")}`} />}
              </div>
            </>
          )}

          <p className="text-[10px] text-muted-foreground italic pt-1">
            {t("yeast_fresh_note")} · {yeastType === "fresh" ? t("yeast_fresh") : t("yeast_dry")} = {yeastShown.toFixed(3)}g
            {" "}(fresh eq. {yeastFresh.toFixed(3)}g)
          </p>
        </Card>

        {/* Save */}
        <Card className="p-4 space-y-3 sticky bottom-20 sm:relative sm:bottom-auto border-primary/30 bg-card/95 backdrop-blur">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("recipe_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${t(cfg.labelKey)} ${clampedHydration}%`}
              className="mt-1"
            />
          </div>
          {!user && <Warning>{t("auth_required")}</Warning>}
          <Button size="lg" className="w-full h-12 font-semibold" onClick={() => save(true)} disabled={saving}>
            <Save className="size-4 mr-2" /> {saving ? "…" : t("save_recipe")}
          </Button>

        </Card>
      </div>
    </AppShell>
  );
}

/* ---- UI helpers ---- */

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
        <Input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
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
      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
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
          <Slider
            value={[value]}
            min={min} max={max} step={step}
            onValueChange={(v) => onValue(v[0])}
          />
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
  return (
    <div className="text-[10px] uppercase tracking-widest text-primary/80 font-bold pt-2">
      {children}
    </div>
  );
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
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("flour_recos")}</div>
      <div className="flex flex-wrap gap-1.5">
        {cat.recos.map((r) => (
          <span key={r} className="text-[11px] px-2 py-0.5 rounded border border-border/60 bg-card tabular">
            {r}
          </span>
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
      <NumField label={t("tray_count")} value={trays.count} onChange={(v) => setTrays({ ...trays, count: Math.max(1, v) })} min={1} />
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
      <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("tray_dough")}</span>
          <span className="tabular font-bold text-primary">{weight}g</span>
        </div>
        <p className="text-[10px] text-muted-foreground tabular">
          {t("tray_formula")
            .replace("{surface}", String(trays.lengthCm * trays.widthCm))
            .replace("{weight}", String(weight))}
        </p>
      </div>
    </div>
  );
}
