import { forwardRef } from "react";
import type { SavedRecipe } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

interface Props {
  recipe: SavedRecipe;
  voute: readonly [number, number] | number[];
  sole: readonly [number, number] | number[];
  isPoolish: boolean;
}

/**
 * Off-screen, fully-expanded, print-ready recipe layout used to render a
 * complete PDF via html2pdf. Neutral colors + inline styles so the PDF
 * renders identically regardless of the dark app theme.
 */
export const PrintableRecipe = forwardRef<HTMLDivElement, Props>(function PrintableRecipe(
  { recipe, voute, sole, isPoolish },
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
    rows.push(["bulk", t("bulk_ferment"), `${recipe.calc.bulkFermentMin ?? 30} ${t("minutes")} @ ${recipe.inputs.cellarTemp}°C`]);
  }

  const phaseLabel: Record<string, string> = {
    biga: t("phase1_title"),
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

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const S = {
    page: {
      fontFamily: "Helvetica, Arial, sans-serif",
      color: "#111",
      background: "#fff",
      padding: "24px 28px",
      width: "760px",
      fontSize: "12px",
      lineHeight: 1.45,
    } as const,
    h1: { fontSize: "22px", margin: "0 0 4px 0", color: "#b8410f" } as const,
    h2: { fontSize: "14px", margin: "18px 0 6px 0", color: "#b8410f", borderBottom: "1px solid #eee", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.06em" } as const,
    h3: { fontSize: "12px", margin: "10px 0 4px 0", color: "#333", textTransform: "uppercase", letterSpacing: "0.05em" } as const,
    meta: { color: "#555", fontSize: "11px" } as const,
    table: { width: "100%", borderCollapse: "collapse" as const, marginTop: "4px" },
    td: { padding: "4px 6px", borderBottom: "1px solid #eee" } as const,
    right: { textAlign: "right" as const, fontVariantNumeric: "tabular-nums" as const, fontWeight: 600 as const },
    pre: { whiteSpace: "pre-wrap" as const, background: "#f7f4f0", padding: "8px 10px", borderRadius: "6px", fontFamily: "Helvetica, Arial, sans-serif", fontSize: "11.5px", margin: "6px 0 0 0" },
    grid: { display: "flex", flexWrap: "wrap" as const, gap: "10px", marginTop: "6px" },
    box: { border: "1px solid #ddd", borderRadius: "6px", padding: "8px 10px", minWidth: "150px", flex: "1" } as const,
    tempBox: { border: "1px solid #d97706", background: "#fff8ec", padding: "10px 12px", borderRadius: "6px", flex: "1" } as const,
    photoGrid: { display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "6px" },
    photo: { width: "180px", height: "180px", objectFit: "cover" as const, borderRadius: "6px", border: "1px solid #ddd" } as const,
  };

  return (
    <div ref={ref} style={S.page}>
      <div style={{ borderBottom: "2px solid #b8410f", paddingBottom: "10px", marginBottom: "10px" }}>
        <div style={{ ...S.meta, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "#b8410f" }}>
          {engine === "biga"
            ? (isPoolish ? t("preferment_poolish") : t("engine_biga"))
            : t("engine_direct")}
        </div>
        <h1 style={S.h1}>{recipe.name}</h1>
        <div style={S.meta}>
          {recipe.inputs.ballsCount} × {recipe.inputs.ballWeight}g · {recipe.inputs.hydration}% hydr. · W{recipe.inputs.flourW} · {recipe.inputs.cellarTemp}°C
        </div>
      </div>

      <h2 style={S.h2}>{t("overview")}</h2>
      <div style={S.grid}>
        <div style={S.box}><div style={S.meta}>{t("total_dough")}</div><div style={{ fontWeight: 700 }}>{recipe.calc.totalDough.toFixed(0)} {g}</div></div>
        <div style={S.box}><div style={S.meta}>{t("total_flour")}</div><div style={{ fontWeight: 700 }}>{recipe.calc.totalFlour.toFixed(1)} {g}</div></div>
        <div style={S.box}><div style={S.meta}>{t("total_water")}</div><div style={{ fontWeight: 700 }}>{recipe.calc.totalWater.toFixed(1)} {g}</div></div>
        <div style={S.box}><div style={S.meta}>{t("total_salt")}</div><div style={{ fontWeight: 700 }}>{recipe.calc.totalSalt.toFixed(1)} {g}</div></div>
      </div>

      <h2 style={S.h2}>{t("ingredients")}</h2>
      {phases.map((p) => (
        <div key={p} style={{ marginBottom: "10px" }}>
          <h3 style={S.h3}>{phaseLabel[p]}</h3>
          <table style={S.table}>
            <tbody>
              {rows.filter((r) => r[0] === p).map((r, i) => (
                <tr key={i}>
                  <td style={S.td}>{r[1]}</td>
                  <td style={{ ...S.td, ...S.right }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {phaseSteps[p] && <pre style={S.pre}>{phaseSteps[p]}</pre>}
        </div>
      ))}

      <h2 style={S.h2}>{t("protocol")}</h2>
      <table style={S.table}>
        <tbody>
          {recipe.timeline.map((s) => (
            <tr key={s.id}>
              <td style={S.td}>{t(s.labelKey)}</td>
              <td style={{ ...S.td, ...S.right }}>{fmt(s.timeISO)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={S.h2}>{t("bake_temps")}</h2>
      <div style={S.grid}>
        <div style={S.tempBox}>
          <div style={{ ...S.meta, color: "#b8410f", fontWeight: 700, textTransform: "uppercase" }}>{t("bake_voute")}</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#b8410f" }}>{voute[0]}–{voute[1]} °C</div>
        </div>
        <div style={S.tempBox}>
          <div style={{ ...S.meta, color: "#b8410f", fontWeight: 700, textTransform: "uppercase" }}>{t("bake_sole")}</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#b8410f" }}>{sole[0]}–{sole[1]} °C</div>
        </div>
      </div>

      {recipe.notes.trim() && (
        <>
          <h2 style={S.h2}>{t("notes")}</h2>
          <pre style={S.pre}>{recipe.notes}</pre>
        </>
      )}

      {recipe.photos.length > 0 && (
        <>
          <h2 style={S.h2}>{t("photos")}</h2>
          <div style={S.photoGrid}>
            {recipe.photos.map((p, i) => (
              <img key={i} src={p} alt={`photo ${i}`} style={S.photo} />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
