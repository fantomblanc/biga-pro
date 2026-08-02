import { forwardRef, useEffect, useState } from "react";
import type { SavedRecipe } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { photoUrl } from "@/lib/cloud";
import type { ProtocolStep } from "@/routes/recipe.$id";

interface Props {
  recipe: SavedRecipe;
  voute: readonly [number, number] | number[];
  sole: readonly [number, number] | number[];
  isPoolish: boolean;
  protocolSteps: ProtocolStep[];
}

/**
 * Full-detail, print-ready recipe sheet. Rendered hidden on screen and
 * revealed by the `.print-sheet` rules in src/styles.css when the user
 * triggers window.print().
 */
export const PrintableRecipe = forwardRef<HTMLDivElement, Props>(function PrintableRecipe(
  { recipe, voute, sole, isPoolish, protocolSteps },
  ref,
) {
  const { t } = useI18n();
  const g = t("grams");
  const engine = recipe.inputs.engine;
  const yeastShown = engine === "biga" ? recipe.calc.bigaYeastShown : recipe.calc.directYeastShown;

  const rows: Array<[string, string, string]> = [];
  if (engine === "biga") {
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
  }

  const phaseLabel: Record<string, string> = {
    biga: t("phase1_title"),
    refresh: isPoolish ? t("phase2_title_poolish") : t("phase2_title"),
    mix: t("direct_phase_title"),
  };
  const phases = [...new Set(rows.map((r) => r[0]))];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div ref={ref} className="print-sheet bg-white text-black p-6 text-[12px] leading-relaxed">
      <div className="border-b-2 border-[#b8410f] pb-2.5 mb-2.5">
        <div className="uppercase tracking-widest text-[10px] font-bold text-[#b8410f]">
          {engine === "biga"
            ? (isPoolish ? t("preferment_poolish") : t("engine_biga"))
            : t("engine_direct")}
        </div>
        <h1 className="text-[22px] font-bold m-0 mt-1 text-[#b8410f]">{recipe.name}</h1>
        <div className="text-[#555] text-[11px]">
          {recipe.inputs.ballsCount} × {recipe.inputs.ballWeight}g · {recipe.inputs.hydration}% hydr. · W{recipe.inputs.flourW} · {recipe.inputs.cellarTemp}°C
        </div>
      </div>

      <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("overview")}</h2>
      <div className="flex flex-wrap gap-2.5 mt-1.5">
        <Box label={t("total_dough")} value={`${recipe.calc.totalDough.toFixed(0)} ${g}`} />
        <Box label={t("total_flour")} value={`${recipe.calc.totalFlour.toFixed(1)} ${g}`} />
        <Box label={t("total_water")} value={`${recipe.calc.totalWater.toFixed(1)} ${g}`} />
        <Box label={t("total_salt")} value={`${recipe.calc.totalSalt.toFixed(1)} ${g}`} />
      </div>

      <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("ingredients")}</h2>
      {phases.map((p) => (
        <div key={p} className="mb-2.5 avoid-break">
          <h3 className="text-xs uppercase tracking-wide text-[#333] my-1.5">{phaseLabel[p]}</h3>
          <table className="w-full border-collapse">
            <tbody>
              {rows.filter((r) => r[0] === p).map((r, i) => (
                <tr key={i}>
                  <td className="py-1 px-1.5 border-b border-[#eee]">{r[1]}</td>
                  <td className="py-1 px-1.5 border-b border-[#eee] text-right font-semibold tabular">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("protocol_detail")}</h2>
      {protocolSteps.map((step) => (
        <div key={step.key} className="mb-2 avoid-break">
          <h3 className="text-xs uppercase tracking-wide text-[#333] my-1">{t(step.titleKey)}</h3>
          {step.lines.map((line, i) => (
            <p key={i} className="m-0 mb-1">{line}</p>
          ))}
        </div>
      ))}

      <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("timeline")}</h2>
      <table className="w-full border-collapse">
        <tbody>
          {recipe.timeline.map((s) => (
            <tr key={s.id}>
              <td className="py-1 px-1.5 border-b border-[#eee]">{t(s.labelKey)}</td>
              <td className="py-1 px-1.5 border-b border-[#eee] text-right font-semibold tabular">{fmt(s.timeISO)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("bake_temps")}</h2>
      <div className="flex flex-wrap gap-2.5 mt-1.5">
        <TempBox label={t("bake_voute")} value={`${voute[0]}–${voute[1]} °C`} />
        <TempBox label={t("bake_sole")} value={`${sole[0]}–${sole[1]} °C`} />
      </div>

      {recipe.notes.trim() && (
        <>
          <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("notes")}</h2>
          <pre className="whitespace-pre-wrap bg-[#f7f4f0] p-2.5 rounded-md font-sans text-[11.5px] m-0">{recipe.notes}</pre>
        </>
      )}

      {recipe.photos.length > 0 && (
        <>
          <h2 className="text-sm uppercase tracking-wide font-bold text-[#b8410f] border-b border-[#eee] pb-1 mt-4 mb-1.5 avoid-break">{t("photos")}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {recipe.photos.map((p, i) => (
              <PrintPhoto key={i} path={p} alt={`photo ${i}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
});

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#ddd] rounded-md py-2 px-2.5 min-w-[140px] flex-1">
      <div className="text-[#555] text-[11px]">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function TempBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#d97706] bg-[#fff8ec] py-2.5 px-3 rounded-md flex-1">
      <div className="text-[#b8410f] font-bold uppercase text-[11px]">{label}</div>
      <div className="text-lg font-bold text-[#b8410f]">{value}</div>
    </div>
  );
}

function PrintPhoto({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    photoUrl(path).then((u) => { if (!cancelled) setUrl(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  if (!url) return null;
  return <img src={url} alt={alt} className="w-[170px] h-[170px] object-cover rounded-md border border-[#ddd]" />;
}
