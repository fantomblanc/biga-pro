import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  setActiveId, loadActiveId, clearActiveId,
  type SavedRecipe,
} from "@/lib/storage";
import {
  getRecipe, saveRecipe, uploadPhoto, photoUrl, deletePhoto as deleteCloudPhoto,
  shareRecipe, unshareRecipe,
} from "@/lib/cloud";
import { calcFinalProofHours, buildTimeline } from "@/lib/dough-engine";
import { computeAutolyse, prefermentProfile, PREFERMENT_LOCATION_LABEL_KEY } from "@/lib/dough-pro";
import { flourById } from "@/lib/dough-pro";


import { Timeline } from "@/components/Timeline";
import { CookTimer } from "@/components/CookTimer";
import { WaterTempCalculator } from "@/components/WaterTempCalculator";
import { PrintableRecipe } from "@/components/PrintableRecipe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  RotateCcw, Printer, Camera, Trash2, Wrench, Play, ChevronLeft, MonitorUp,
  MonitorOff, Save, LifeBuoy, Share2, Copy, Ban,
} from "lucide-react";
import { useWakeLock } from "@/lib/wake-lock";
import { toast } from "sonner";
import { requestNotifPermission, scheduleNotification, clearScheduled, notifDeniedHelpKey } from "@/lib/notifications";
import { loadSettings } from "@/lib/storage";

export const Route = createFileRoute("/recipe/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Recipe · CarpiBiga Pro` },
      { name: "description", content: `Active dough recipe protocol with timeline, cook timer, water temp and journal.` },
    ],
  }),
  component: RecipePage,
});

export interface ProtocolStep {
  key: string;
  titleKey: string;
  lines: string[];
}

export function buildProtocol(
  recipe: SavedRecipe,
  t: (k: string) => string,
  voute: readonly [number, number] | number[],
  sole: readonly [number, number] | number[],
): ProtocolStep[] {
  const c = recipe.calc;
  const inp = recipe.inputs;
  const g = t("grams");
  const isBiga = inp.engine === "biga";
  const isPoolish = isBiga && (c.preFerment ?? inp.preFerment) === "poolish";
  const steps: ProtocolStep[] = [];
  const num = (v: number | undefined, d = 1) => `${(v ?? 0).toFixed(d)} ${g}`;

  if (inp.autolyse?.enabled) {
    const auto = computeAutolyse(inp.autolyse, c.totalFlour, c.totalWater, inp.flourW);
    const yeastNote = inp.autolyse.kind === "fermentolyse" ? t("autolyse_step_yeast") : "";
    steps.push({
      key: "autolyse",
      titleKey: "autolyse_title",
      lines: [
        t("autolyse_step")
          .replace("{flour}", num(auto.flour))
          .replace("{water}", num(auto.water))
          .replace("{min}", `${inp.autolyse.minutes}`)
          .replace("{yeast}", yeastNote),
      ],
    });
  }

  if (isBiga) {
    /* ---- PHASE 1 — Pre-ferment ---- */
    const preHydr = c.preFermentHydrPct ?? (isPoolish ? 100 : 45);
    steps.push({
      key: "phase1",
      titleKey: isPoolish ? "proto_phase1_title_poolish" : "proto_phase1_title",
      lines: [
        t("proto_phase1_weigh")
          .replace("{flour}", num(c.bigaFlour))
          .replace("{pct}", String(c.bigaPct ?? inp.bigaPct ?? 80))
          .replace("{water}", num(c.bigaWater))
          .replace("{hydr}", String(preHydr))
          .replace("{temp}", `${(c.bigaWaterTemp ?? 0).toFixed(1)}`)
          .replace("{yeast}", num(c.bigaYeastShown, 2)),
        isPoolish ? t("proto_phase1_mix_poolish") : t("proto_phase1_mix_biga"),
      ],
    });

    /* ---- PHASE 2 — Maturation ---- */
    const loc = inp.prefermentLoc ?? "cellar";
    const prof = prefermentProfile(loc, isPoolish ? "poolish" : "biga");
    steps.push({
      key: "phase2",
      titleKey: "proto_phase2_title",
      lines: [
        t("proto_phase2_rest")
          .replace("{hours}", String(prof.hours))
          .replace("{temp}", String(inp.cellarTemp))
          .replace("{loc}", t(PREFERMENT_LOCATION_LABEL_KEY[loc])),
      ],
    });

    /* ---- PHASE 3 — Refreshment ---- */
    const p3: string[] = [];
    const bassinage = c.bassinageWater ?? 0;
    const firstWater = Math.max(0, (c.refreshWater ?? 0) - bassinage);
    p3.push(
      t("proto_phase3_start")
        .replace("{water}", num(firstWater))
        .replace("{temp}", `${(c.refreshWaterTemp ?? 0).toFixed(1)}`),
    );
    if ((c.refreshFlour ?? 0) > 0.5) {
      p3.push(t("proto_phase3_flour").replace("{flour}", num(c.refreshFlour)).replace("{pct}", String(100 - (c.bigaPct ?? 80))));
    }
    if (inp.blend?.enabled) {
      const a = flourById(inp.blend.flourAId);
      const b = flourById(inp.blend.flourBId);
      if (a && b) {
        const ra = inp.blend.ratioA / 100;
        p3.push(
          t("proto_knead_blend")
            .replace("{nameA}", a.name)
            .replace("{a}", num(c.refreshFlour * ra))
            .replace("{nameB}", b.name)
            .replace("{b}", num(c.refreshFlour * (1 - ra))),
        );
      }
    }
    if ((c.refreshYeastPct ?? 0) > 0) {
      p3.push(
        t("proto_phase3_yeast")
          .replace("{yeast}", num(c.refreshYeastShown, 2))
          .replace("{pct}", (c.refreshYeastPct ?? 0).toFixed(2)),
      );
    }
    p3.push(t("proto_phase3_salt").replace("{salt}", num(c.totalSalt)));
    if (inp.useMalt) p3.push(t("proto_malt").replace("{malt}", num(c.totalMalt, 2)));
    if (inp.useOil) p3.push(t("proto_oil").replace("{oil}", num(c.totalOil)));
    if (bassinage > 0) p3.push(t("proto_bassinage").replace("{water}", num(bassinage)));
    p3.push(t("proto_phase3_end").replace("{temp}", "23–24"));
    steps.push({ key: "phase3", titleKey: "proto_phase3_title", lines: p3 });

    /* ---- PHASE 4 — Bulk, balling, proof, bake ---- */
    const ballLine = inp.trays
      ? t("proto_ball_trays")
          .replace("{count}", `${inp.trays.count}`)
          .replace("{weight}", `${Math.round(c.totalDough / inp.trays.count)}`)
      : t("proto_ball").replace("{count}", `${inp.ballsCount}`).replace("{weight}", `${inp.ballWeight}`);
    steps.push({
      key: "phase4",
      titleKey: "proto_phase4_title",
      lines: [
        t("proto_bulk").replace("{min}", `${c.bulkFermentMin ?? 30}`).replace("{temp}", `${inp.cellarTemp}`),
        ballLine,
        t("proto_proof").replace("{hours}", `${recipe.finalProofH.toFixed(1)}`),
        t("proto_bake").replace("{voute}", `${voute[0]}–${voute[1]}`).replace("{sole}", `${sole[0]}–${sole[1]}`),
      ],
    });

    return steps;
  }

  /* ---------------- Direct method ---------------- */
  const kneadLines: string[] = [
    t("proto_knead")
      .replace("{yeast}", num(c.directYeastShown, 3))
      .replace("{water}", num(c.totalWater))
      .replace("{flour}", num(c.totalFlour))
      .replace("{salt}", num(c.totalSalt)),
    t("proto_water_temp_single").replace("{temp}", `${(c.refreshWaterTemp ?? 0).toFixed(1)}`),
  ];
  if (inp.blend?.enabled) {
    const a = flourById(inp.blend.flourAId);
    const b = flourById(inp.blend.flourBId);
    if (a && b) {
      const ra = inp.blend.ratioA / 100;
      kneadLines.push(
        t("proto_knead_blend")
          .replace("{nameA}", a.name)
          .replace("{a}", num(c.totalFlour * ra))
          .replace("{nameB}", b.name)
          .replace("{b}", num(c.totalFlour * (1 - ra))),
      );
    }
  }
  if (inp.useMalt) kneadLines.push(t("proto_malt").replace("{malt}", num(c.totalMalt, 2)));
  if (inp.useOil) kneadLines.push(t("proto_oil").replace("{oil}", num(c.totalOil)));
  steps.push({ key: "knead", titleKey: "step_knead_title", lines: kneadLines });

  steps.push({
    key: "bulk",
    titleKey: "step_bulk_title",
    lines: [t("proto_bulk").replace("{min}", `${c.bulkFermentMin ?? 30}`).replace("{temp}", `${inp.cellarTemp}`)],
  });

  const ballLine = inp.trays
    ? t("proto_ball_trays")
        .replace("{count}", `${inp.trays.count}`)
        .replace("{weight}", `${Math.round(c.totalDough / inp.trays.count)}`)
    : t("proto_ball").replace("{count}", `${inp.ballsCount}`).replace("{weight}", `${inp.ballWeight}`);
  steps.push({ key: "ball", titleKey: "step_ball_title", lines: [ballLine] });

  steps.push({
    key: "proof",
    titleKey: "step_proof_title",
    lines: [t("proto_proof").replace("{hours}", `${recipe.finalProofH.toFixed(1)}`)],
  });

  steps.push({
    key: "bake",
    titleKey: "step_bake_title",
    lines: [t("proto_bake").replace("{voute}", `${voute[0]}–${voute[1]}`).replace("{sole}", `${sole[0]}–${sole[1]}`)],
  });

  return steps;
}


function DetailedProtocol({ steps }: { steps: ProtocolStep[] }) {
  const { t } = useI18n();
  return (
    <Card className="p-4 space-y-3 avoid-break">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {t("protocol_detail")}
      </h2>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-3">
            <span className="grid place-items-center size-6 shrink-0 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
              {i + 1}
            </span>
            <div className="space-y-1">
              <div className="text-sm font-semibold">{t(s.titleKey)}</div>
              {s.lines.map((l, j) => (
                <p key={j} className="text-xs text-muted-foreground leading-relaxed">{l}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function RecipePage() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [kitchenTemp, setKitchenTemp] = useState(22);
  const [kitchenPromptOpen, setKitchenPromptOpen] = useState(false);
  const [rigeneroOpen, setRigeneroOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const kitchenAskedRef = useRef(false);

  useWakeLock(wakeOn);

  useEffect(() => {
    let cancelled = false;
    setLoadingRecipe(true);
    getRecipe(id)
      .then((r) => { if (!cancelled) { setRecipe(r); setShareUrl(r?.isShared && r.shareToken ? `${window.location.origin}/share/${r.shareToken}` : null); } })
      .catch((e) => { console.error(e); if (!cancelled) setRecipe(null); })
      .finally(() => { if (!cancelled) setLoadingRecipe(false); });
    setIsActive(loadActiveId() === id);
    return () => { cancelled = true; };
  }, [id]);


  // Auto-open kitchen temp prompt shortly before final proof
  useEffect(() => {
    if (!recipe || kitchenAskedRef.current) return;
    const proofStep = recipe.timeline.find((s) => s.id === "proof_start");
    if (!proofStep) return;
    const proofTime = new Date(proofStep.timeISO).getTime();
    const now = Date.now();
    // Prompt window: 60min before proof to 30min after
    if (now > proofTime - 60 * 60_000 && now < proofTime + 30 * 60_000) {
      kitchenAskedRef.current = true;
      setKitchenPromptOpen(true);
    }
  }, [recipe]);

  // Schedule notifications when made active
  useEffect(() => {
    if (!recipe || !isActive) return;
    const settings = loadSettings();
    if (!settings.notificationsEnabled) return;
    const deniedKey = notifDeniedHelpKey();
    if (deniedKey) {
      toast.error(t(deniedKey));
      return;
    }
    recipe.timeline.forEach((s) => {
      scheduleNotification(recipe.id, s.id, s.timeISO, `🍕 ${recipe.name}`, t(s.labelKey));
    });
    return () => clearScheduled(recipe.id);
  }, [recipe, isActive, t]);

  if (loadingRecipe) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground text-center py-16">…</p>
      </AppShell>
    );
  }

  if (!recipe) {
    return (
      <AppShell>
        <div className="text-center py-16 space-y-4">
          <p className="text-muted-foreground">{t("recipe_not_found")}</p>
          <Button asChild variant="ghost"><Link to="/"><ChevronLeft className="size-4 mr-1" /> {t("back")}</Link></Button>
        </div>
      </AppShell>
    );
  }

  function loadAsActive() {
    setActiveId(recipe!.id);
    setIsActive(true);
    toast.success(t("load_recipe"));
  }

  function resetSession() {
    clearScheduled(recipe!.id);
    clearActiveId();
    setIsActive(false);
    toast.success(t("session_reset"));
  }

  function persist(updated: SavedRecipe) {
    setRecipe(updated);
    saveRecipe(updated).catch((e) => {
      console.error(e);
      toast.error(t("cloud_error"));
    });
  }

  function recalibrateProof(newTemp: number) {
    const finalProofH = calcFinalProofHours(newTemp);
    const timeline = buildTimeline(recipe!.inputs, finalProofH);
    persist({ ...recipe!, timeline, finalProofH });
    setKitchenPromptOpen(false);
    toast.success(`${t("proof_time")}: ${finalProofH.toFixed(1)}${t("hours")}`);
  }

  function saveNotes(notes: string) {
    persist({ ...recipe!, notes });
  }

  async function addPhoto(file: File) {
    try {
      const path = await uploadPhoto(recipe!.id, file);
      persist({ ...recipe!, photos: [...recipe!.photos, path] });
    } catch (e) {
      console.error(e);
      toast.error(t("cloud_error"));
    }
  }

  function deletePhoto(idx: number) {
    const target = recipe!.photos[idx];
    const photos = recipe!.photos.filter((_, i) => i !== idx);
    persist({ ...recipe!, photos });
    if (target) void deleteCloudPhoto(target).catch(() => {});
  }


  function suggestedBake(r: SavedRecipe): { voute: [number, number]; sole: [number, number] } {
    const voute = (r.calc.bakeVoute ?? (
      r.inputs.engine === "direct" ? [400, 420] :
        r.inputs.hydration < 67 ? [430, 450] : [420, 440]
    )) as [number, number];
    const sole = (r.calc.bakeSole ?? (
      r.inputs.engine === "direct" ? [360, 380] :
        r.inputs.hydration < 67 ? [380, 400] : [350, 370]
    )) as [number, number];
    return { voute, sole };
  }

  function updateCustomBake(voute: [number, number] | undefined, sole: [number, number] | undefined) {
    persist({ ...recipe!, customBakeVoute: voute, customBakeSole: sole });
  }


  function printRecipe() {
    window.print();
  }

  async function toggleShare() {
    setShareBusy(true);
    try {
      if (shareUrl) {
        await unshareRecipe(recipe!.id);
        setShareUrl(null);
        setRecipe({ ...recipe!, isShared: false });
      } else {
        const url = await shareRecipe(recipe!.id);
        setShareUrl(url);
        setRecipe({ ...recipe!, isShared: true });
      }
    } catch (e) {
      console.error(e);
      toast.error(t("cloud_error"));
    } finally {
      setShareBusy(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("share_copied"));
    } catch (e) {
      console.error(e);
    }
  }

  const yeastShown = recipe.inputs.engine === "biga" ? recipe.calc.bigaYeastShown : recipe.calc.directYeastShown;
  const suggested = suggestedBake(recipe);
  const activeVoute: [number, number] = recipe.customBakeVoute ?? suggested.voute;
  const activeSole: [number, number] = recipe.customBakeSole ?? suggested.sole;
  const isPoolish = recipe.inputs.engine === "biga" && (recipe.calc.preFerment ?? recipe.inputs.preFerment) === "poolish";
  const protocolSteps = buildProtocol(recipe, t, activeVoute, activeSole);
  const bakeStepExtra = t("step_bake_at")
    .replace("{voute}", `${activeVoute[0]}–${activeVoute[1]}`)
    .replace("{sole}", `${activeSole[0]}–${activeSole[1]}`);
  const timelineExtras = { bake: bakeStepExtra };

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2 mb-4 no-print">
        <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4 mr-1" /> {t("back")}
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant={wakeOn ? "default" : "outline"}
            size="sm"
            onClick={() => setWakeOn((v) => !v)}
            title={wakeOn ? t("wake_lock_on") : t("wake_lock_off")}
          >
            {wakeOn ? <MonitorUp className="size-4" /> : <MonitorOff className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={printRecipe} title={t("print_hint")}>
            <Printer className="size-4 mr-1" /> {t("print_recipe")}
          </Button>
          <Button
            variant={shareUrl ? "default" : "outline"}
            size="sm"
            onClick={toggleShare}
            disabled={shareBusy}
            title={shareUrl ? t("share_stop") : t("share_recipe")}
          >
            {shareUrl ? <Ban className="size-4" /> : <Share2 className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Header hero */}
      <Card className="p-5 mb-4 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-40 rounded-full ember-gradient opacity-20 blur-2xl" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">
            {recipe.inputs.engine === "biga"
              ? ((recipe.calc.preFerment ?? recipe.inputs.preFerment) === "poolish" ? t("preferment_poolish") : t("engine_biga"))
              : t("engine_direct")}
            {isActive && <span className="ml-2 px-1.5 py-0.5 rounded bg-success/20 text-[color:var(--success)]">• {t("active")}</span>}
          </div>

          <h1 className="font-display text-2xl font-bold mt-1">{recipe.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground tabular">
            <span>{recipe.inputs.ballsCount} × {recipe.inputs.ballWeight}g</span>
            <span>{recipe.inputs.hydration}% hydr.</span>
            <span>W{recipe.inputs.flourW}</span>
            <span>{recipe.inputs.cellarTemp}°C cellar</span>
          </div>
          {!isActive && (
            <Button size="sm" className="mt-4" onClick={loadAsActive}>
              <Play className="size-4 mr-1" /> {t("load_recipe")}
            </Button>
          )}
        </div>
      </Card>

      <Tabs defaultValue="protocol" className="w-full">
        <TabsList className="grid grid-cols-4 w-full no-print">
          <TabsTrigger value="protocol">{t("protocol")}</TabsTrigger>
          <TabsTrigger value="ingredients">{t("ingredients")}</TabsTrigger>
          <TabsTrigger value="tools">{t("tools")}</TabsTrigger>
          <TabsTrigger value="journal">{t("journal")}</TabsTrigger>
        </TabsList>

        {/* PROTOCOL */}
        <TabsContent value="protocol" className="space-y-4 pt-4">
          <Timeline steps={recipe.timeline} extras={timelineExtras} />

          <BakingTempsCard
            recipe={recipe}
            suggestedVoute={suggested.voute}
            suggestedSole={suggested.sole}
            customVoute={recipe.customBakeVoute}
            customSole={recipe.customBakeSole}
            onChange={updateCustomBake}
          />

          <DetailedProtocol steps={protocolSteps} />

          {recipe.calc.bulkTooHot && (
            <p className="text-xs text-warning-foreground/90 bg-warning/10 border border-warning/40 rounded-md p-2">
              {t("bulk_hot_warning")}
            </p>
          )}

          {shareUrl && (
            <Card className="p-3 flex items-center justify-between gap-2 no-print">
              <p className="text-xs text-muted-foreground">{t("share_active")}</p>
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="size-3.5 mr-1" /> {t("share_copy")}
              </Button>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2 no-print">
            <Button
              variant="outline"
              onClick={() => setKitchenPromptOpen(true)}
            >
              <Wrench className="size-4 mr-2" /> {t("recalibrate")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><RotateCcw className="size-4 mr-2" /> {t("reset_session")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("reset_session")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("reset_confirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={resetSession}>{t("confirm")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {recipe.inputs.engine === "direct" && (
            <Button variant="secondary" className="w-full" onClick={() => setRigeneroOpen(true)}>
              <LifeBuoy className="size-4 mr-2" /> {t("rigenero")}
            </Button>
          )}
        </TabsContent>


        {/* INGREDIENTS */}
        <TabsContent value="ingredients" className="pt-4">
          <IngredientsTable recipe={recipe} yeastShown={yeastShown} />
        </TabsContent>

        {/* TOOLS */}
        <TabsContent value="tools" className="space-y-4 pt-4">
          <CookTimer />
          <WaterTempCalculator defaultRoom={recipe.inputs.cellarTemp} />
        </TabsContent>

        {/* JOURNAL */}
        <TabsContent value="journal" className="space-y-4 pt-4">
          <Card className="p-4 space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("notes")}</Label>
            <Textarea
              value={recipe.notes}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder={t("notes_placeholder")}
              rows={5}
              className="resize-none"
            />
          </Card>
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("photos")}</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("photo_hint")}</p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }}
                />
                <span className="inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                  <Camera className="size-4 mr-1.5" /> {t("add_photo")}
                </span>
              </label>
            </div>
            {recipe.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {recipe.photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    <CloudImg path={p} alt={`crumb ${i}`} />
                    <button
                      onClick={() => deletePhoto(i)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-80 hover:opacity-100"
                      aria-label="delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Kitchen temp prompt */}
      <Dialog open={kitchenPromptOpen} onOpenChange={setKitchenPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🌡️ {t("kitchen_temp_prompt")}</DialogTitle>
            <DialogDescription>{t("kitchen_temp_desc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs text-muted-foreground">{t("room_temp")}</Label>
            <Input
              type="number"
              step="0.5"
              value={kitchenTemp}
              onChange={(e) => setKitchenTemp(Number(e.target.value))}
              className="tabular text-2xl h-14 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-3">
              → {t("proof_time")}: <span className="tabular text-primary font-semibold">{calcFinalProofHours(kitchenTemp).toFixed(1)}{t("hours")}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setKitchenPromptOpen(false)}>{t("cancel")}</Button>
            <Button onClick={() => recalibrateProof(kitchenTemp)}>{t("recalibrate")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rigenero */}
      <Dialog open={rigeneroOpen} onOpenChange={setRigeneroOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LifeBuoy className="size-4 text-primary" />{t("rigenero")}</DialogTitle>
            <DialogDescription>{t("rigenero_desc")}</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded-lg p-4 leading-relaxed font-sans">
            {t("rigenero_steps")}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Printable layout — hidden on screen, the only thing shown when printing */}
      <div className="hidden print:block">
        <PrintableRecipe
          ref={printableRef}
          recipe={recipe}
          voute={activeVoute}
          sole={activeSole}
          isPoolish={isPoolish}
          protocolSteps={protocolSteps}
        />
      </div>

    </AppShell>
  );
}

function CloudImg({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    photoUrl(path).then((u) => { if (!cancelled) setUrl(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return <div className="w-full h-full bg-muted animate-pulse" />;
  return <img src={url} alt={alt} className="w-full h-full object-cover" />;
}

function IngredientsTable({ recipe, yeastShown }: { recipe: SavedRecipe; yeastShown: number }) {
  const { t } = useI18n();
  const rows: Array<[string, string, string]> = [];
  const g = t("grams");
  const isPoolish = recipe.inputs.engine === "biga" && (recipe.calc.preFerment ?? recipe.inputs.preFerment) === "poolish";

  if (recipe.inputs.engine === "biga") {
    const bigaPct = recipe.calc.bigaPct ?? recipe.inputs.bigaPct ?? 80;
    const flourLabel = isPoolish ? t("poolish_flour_dyn") : t("biga_flour_dyn");
    const waterLabel = isPoolish ? t("poolish_water") : t("biga_water");
    const yeastLabel = isPoolish ? t("poolish_yeast") : t("biga_yeast");
    rows.push(["biga", `${flourLabel} (${bigaPct}%)`, `${recipe.calc.bigaFlour.toFixed(1)} ${g}`]);
    rows.push(["biga", waterLabel, `${recipe.calc.bigaWater.toFixed(1)} ${g}`]);
    rows.push(["biga", yeastLabel, `${yeastShown.toFixed(3)} ${g}`]);
    rows.push(["refresh", `${t("refresh_flour_dyn")} (${100 - bigaPct}%)`, `${recipe.calc.refreshFlour.toFixed(1)} ${g}`]);
    rows.push(["refresh", t("refresh_water"), `${recipe.calc.refreshWater.toFixed(1)} ${g}`]);
    rows.push(["refresh", t("refresh_salt"), `${recipe.calc.totalSalt.toFixed(1)} ${g}`]);
    if (recipe.inputs.useMalt) rows.push(["refresh", t("refresh_malt"), `${recipe.calc.totalMalt.toFixed(2)} ${g}`]);
    if (recipe.inputs.useOil) rows.push(["refresh", t("refresh_oil"), `${recipe.calc.totalOil.toFixed(1)} ${g}`]);
  } else {
    rows.push(["mix", t("total_flour"), `${recipe.calc.totalFlour.toFixed(1)} ${g}`]);
    rows.push(["mix", t("total_water"), `${recipe.calc.totalWater.toFixed(1)} ${g}`]);
    rows.push(["mix", t("total_salt"), `${recipe.calc.totalSalt.toFixed(1)} ${g}`]);
    rows.push(["mix", t("biga_yeast"), `${yeastShown.toFixed(3)} ${g}`]);
    if (recipe.inputs.useMalt) rows.push(["mix", t("refresh_malt"), `${recipe.calc.totalMalt.toFixed(2)} ${g}`]);
    if (recipe.inputs.useOil) rows.push(["mix", t("refresh_oil"), `${recipe.calc.totalOil.toFixed(1)} ${g}`]);
    rows.push(["bulk", t("bulk_ferment"), `${recipe.calc.bulkFermentMin ?? 30} ${t("minutes")} @ ${recipe.inputs.cellarTemp}°C`]);
  }


  const phaseLabel: Record<string, string> = {
    biga: isPoolish ? t("phase1_title") : t("phase1_title"),
    refresh: isPoolish ? t("phase2_title_poolish") : t("phase2_title"),
    mix: t("direct_phase_title"),
    bulk: t("bulk_ferment"),
  };
  const phaseSteps: Record<string, string> = {
    biga: isPoolish ? t("phase1_steps_poolish") : t("phase1_steps"),
    refresh: isPoolish ? t("phase2_steps_poolish") : t("phase2_steps"),
    mix: t("direct_steps"),
    bulk: "",
  };
  const phases = [...new Set(rows.map((r) => r[0]))];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-display font-semibold text-sm mb-3">{t("overview")}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <TotalRow label={t("total_dough")} value={`${recipe.calc.totalDough.toFixed(0)} ${g}`} strong />
          <TotalRow label={t("total_flour")} value={`${recipe.calc.totalFlour.toFixed(1)} ${g}`} />
          <TotalRow label={t("total_water")} value={`${recipe.calc.totalWater.toFixed(1)} ${g}`} />
          <TotalRow label={t("total_salt")} value={`${recipe.calc.totalSalt.toFixed(1)} ${g}`} />
        </div>
      </Card>
      {phases.map((p) => (
        <Card key={p} className="overflow-hidden">
          <div className="px-4 py-2 border-b border-border/60 bg-secondary/30">
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-primary/90">{phaseLabel[p]}</h4>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {rows.filter((r) => r[0] === p).map((r, i) => (
                <tr key={i} className="border-t border-border/40 first:border-t-0">
                  <td className="px-4 py-3 text-muted-foreground">{r[1]}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {phaseSteps[p] && (
            <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                {t("protocol")}
              </div>
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-sans text-foreground/90">
                {phaseSteps[p]}
              </pre>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}


function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`tabular mt-0.5 ${strong ? "text-base font-bold" : "text-sm font-semibold"}`}>{value}</div>
    </div>
  );
}

function BakingTempsCard({
  recipe,
  suggestedVoute,
  suggestedSole,
  customVoute,
  customSole,
  onChange,
}: {
  recipe: SavedRecipe;
  suggestedVoute: [number, number];
  suggestedSole: [number, number];
  customVoute?: [number, number];
  customSole?: [number, number];
  onChange: (voute: [number, number] | undefined, sole: [number, number] | undefined) => void;
}) {
  const { t } = useI18n();
  const tipKey = recipe.calc.bakeTipKey ?? (
    recipe.inputs.engine === "direct" ? "bake_tip_direct" :
      recipe.inputs.hydration < 67 ? "bake_tip_biga_low" : "bake_tip_biga_high"
  );
  const activeVoute = customVoute ?? suggestedVoute;
  const activeSole = customSole ?? suggestedSole;
  const isCustom = !!(customVoute || customSole);

  function setVoute(idx: 0 | 1, val: number) {
    const base: [number, number] = [...activeVoute] as [number, number];
    base[idx] = val;
    onChange(base, customSole);
  }
  function setSole(idx: 0 | 1, val: number) {
    const base: [number, number] = [...activeSole] as [number, number];
    base[idx] = val;
    onChange(customVoute, base);
  }

  return (
    <Card className="p-4 border-[color:var(--bake)]/40 bg-[color:var(--bake)]/5">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          🔥 {t("bake_temps")}
        </h3>
        {isCustom && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(undefined, undefined)}>
            <RotateCcw className="size-3 mr-1" /> {t("bake_reset")}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{t("bake_custom_desc")}</p>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <TempEditor
          label={t("bake_voute")}
          accent="var(--bake)"
          suggested={suggestedVoute}
          active={activeVoute}
          suggestedLabel={t("bake_suggested")}
          customLabel={t("bake_custom")}
          onChangeMin={(v) => setVoute(0, v)}
          onChangeMax={(v) => setVoute(1, v)}
        />
        <TempEditor
          label={t("bake_sole")}
          accent="var(--final)"
          suggested={suggestedSole}
          active={activeSole}
          suggestedLabel={t("bake_suggested")}
          customLabel={t("bake_custom")}
          onChangeMin={(v) => setSole(0, v)}
          onChangeMax={(v) => setSole(1, v)}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 italic leading-relaxed">{t(tipKey)}</p>
    </Card>
  );
}

function TempEditor({
  label, accent, suggested, active, suggestedLabel, customLabel, onChangeMin, onChangeMax,
}: {
  label: string;
  accent: string;
  suggested: [number, number];
  active: [number, number];
  suggestedLabel: string;
  customLabel: string;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}) {
  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${accent} 10%, transparent)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>{label}</div>
      <div className="text-[10px] text-muted-foreground tabular">
        {suggestedLabel}: <span className="font-semibold">{suggested[0]}–{suggested[1]}°C</span>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{customLabel}</div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={active[0]}
            onChange={(e) => onChangeMin(Number(e.target.value))}
            className="tabular h-9 text-center px-1"
            style={{ color: accent }}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            value={active[1]}
            onChange={(e) => onChangeMax(Number(e.target.value))}
            className="tabular h-9 text-center px-1"
            style={{ color: accent }}
          />
          <span className="text-[10px] text-muted-foreground ml-1">°C</span>
        </div>
      </div>
    </div>
  );
}

function TempGauge({ label, range, accent }: { label: string; range: readonly [number, number] | number[]; accent: string }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${accent} 10%, transparent)`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>{label}</div>
      <div className="tabular font-display text-2xl font-bold mt-1" style={{ color: accent }}>
        {range[0]}–{range[1]}
        <span className="text-xs text-muted-foreground font-normal ml-1">°C</span>
      </div>
    </div>
  );
}

