import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { WaterTempCalculator } from "@/components/WaterTempCalculator";
import {
  calculateRecipe,
  buildTimeline,
  calcFinalProofHours,
  type RecipeInputs,
  type EngineType,
  type YeastType,
} from "@/lib/dough-engine";
import { newId, upsertRecipe, setActiveId } from "@/lib/storage";
import { toast } from "sonner";
import { AlertTriangle, Save, Wheat, Flame, Snowflake } from "lucide-react";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Recipe · CarpiBiga Pro" },
      { name: "description", content: "Create a new Biga or Direct 72h dough recipe with precise weights and fermentation timing." },
    ],
  }),
  component: NewRecipePage,
});

function defaultBakeISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(19, 0, 0, 0);
  // Local ISO for datetime-local input
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function NewRecipePage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineType>("biga");
  const [ballsCount, setBalls] = useState(6);
  const [ballWeight, setBallW] = useState(260);
  const [hydration, setHydr] = useState(67);
  const [saltPct, setSalt] = useState(2.5);
  const [yeastType, setYeast] = useState<YeastType>("fresh");
  const [flourW, setFlourW] = useState(340);
  const [useMalt, setUseMalt] = useState(false);
  const [maltPct, setMalt] = useState(1);
  const [useOil, setUseOil] = useState(false);
  const [oilPct, setOil] = useState(2);
  const [cellarTemp, setCellar] = useState(18);
  const [bigaPct, setBigaPct] = useState(80);
  const [targetBake, setTargetBake] = useState(defaultBakeISO());

  const inputs: RecipeInputs = useMemo(() => ({
    engine, ballsCount, ballWeight, hydration, saltPct, yeastType, flourW,
    useMalt, maltPct, useOil, oilPct, cellarTemp, bigaPct,
    targetBakeISO: new Date(targetBake).toISOString(),
  }), [engine, ballsCount, ballWeight, hydration, saltPct, yeastType, flourW, useMalt, maltPct, useOil, oilPct, cellarTemp, bigaPct, targetBake]);


  const calc = useMemo(() => calculateRecipe(inputs), [inputs]);
  const finalProofH = 3.5; // baseline until recalibrated live
  const timeline = useMemo(() => buildTimeline(inputs, finalProofH), [inputs]);

  function save(loadAsActive: boolean) {
    const id = newId();
    const finalName = name.trim() || (engine === "biga" ? "Biga" : "Direct 72h") + ` ${hydration}%`;
    const recipe = {
      id,
      name: finalName,
      createdAt: new Date().toISOString(),
      inputs,
      calc,
      timeline,
      finalProofH,
      notes: "",
      photos: [],
    };
    upsertRecipe(recipe);
    if (loadAsActive) setActiveId(id);
    toast.success(t("recipe_saved"));
    navigate({ to: "/recipe/$id", params: { id } });
  }

  const yeastFresh = engine === "biga" ? calc.bigaYeastFresh : calc.directYeastFresh;
  const yeastShown = engine === "biga" ? calc.bigaYeastShown : calc.directYeastShown;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold mb-1">{t("new_recipe_title")}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t("tagline")}</p>

      <div className="space-y-4">
        {/* Engine selector */}
        <Card className="p-4">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("engine")}</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <EngineOption
              label={t("engine_biga")}
              icon={<Wheat className="size-4" />}
              active={engine === "biga"}
              onClick={() => setEngine("biga")}
            />
            <EngineOption
              label={t("engine_direct")}
              icon={<Snowflake className="size-4" />}
              active={engine === "direct"}
              onClick={() => setEngine("direct")}
            />
          </div>
          {engine === "biga" && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("biga_pct")}</Label>
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
                <p className="text-[11px] text-muted-foreground leading-tight">{t("biga_pct_help")}</p>
              </div>
            </div>
          )}
        </Card>


        {/* Reverse ingredient converter */}
        <Card className="p-4 space-y-4">
          <SectionTitle icon={<Scale />} title={t("ingredients")} />
          <div className="grid grid-cols-2 gap-3">
            <NumField label={t("balls_count")} value={ballsCount} onChange={setBalls} min={1} />
            <NumField label={t("ball_weight")} value={ballWeight} onChange={setBallW} min={50} step={5} suffix="g" />
            <NumField label={t("hydration")} value={hydration} onChange={setHydr} min={50} max={90} step={0.5} suffix="%" />
            <NumField label={t("salt")} value={saltPct} onChange={setSalt} min={0} max={5} step={0.1} suffix="%" />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("yeast_type")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ToggleBtn active={yeastType === "fresh"} onClick={() => setYeast("fresh")}>{t("yeast_fresh")}</ToggleBtn>
              <ToggleBtn active={yeastType === "dry"} onClick={() => setYeast("dry")}>{t("yeast_dry")}</ToggleBtn>
            </div>
          </div>

          <NumField label={t("flour_w")} value={flourW} onChange={setFlourW} min={100} max={500} step={10} prefix="W" />
          {calc.flourWarning && (
            <Warning>{t("flour_w_warning")}</Warning>
          )}

          {/* Optional ingredients */}
          <div className="space-y-3 pt-2 border-t border-border/50">
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
          </div>
        </Card>

        {/* Environment */}
        <Card className="p-4 space-y-4">
          <SectionTitle icon={<Flame />} title={engine === "biga" ? t("cellar_temp") : t("room_temp_label")} />
          <NumField
            label={engine === "biga" ? t("cellar_temp") : t("room_temp_label")}
            value={cellarTemp} onChange={setCellar}
            min={10} max={30} step={0.5} suffix="°C"
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


        {/* Water temp calc */}
        <WaterTempCalculator defaultRoom={cellarTemp} />

        {/* Live preview breakdown */}
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
              <MiniHeader>{t("biga_phase")} · {bigaPct}%</MiniHeader>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Stat label={`${t("biga_flour_dyn")} (${bigaPct}%)`} value={`${calc.bigaFlour.toFixed(1)}${t("grams")}`} />
                <Stat label={t("biga_water")} value={`${calc.bigaWater.toFixed(1)}${t("grams")}`} />
                <Stat label={t("biga_yeast")} value={`${yeastShown.toFixed(2)}${t("grams")}`} highlight />
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
              placeholder="Biga d'Hiver 67%"
              className="mt-1"
            />
          </div>
          <Button size="lg" className="w-full h-12 font-semibold" onClick={() => save(true)}>
            <Save className="size-4 mr-2" /> {t("save_recipe")}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}

/* ---- little UI helpers ---- */

function Scale(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M16 16.5V21m-8-4.5V21M12 2v14"/><path d="M4 21h16"/><circle cx="6" cy="10" r="3"/><circle cx="18" cy="10" r="3"/></svg>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
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

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EngineOption({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 rounded-lg border flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${
        active
          ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/20"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span className="text-center leading-tight px-2">{label}</span>
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
