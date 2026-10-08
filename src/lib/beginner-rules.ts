import type { FlourRef } from "@/lib/flours";

export type Tier = "weak" | "medium" | "strong";
export type Level = "debutant" | "intermediaire" | "avance";
export type BStyle = "napo" | "teglia" | "rapide";

/** Flour strength tier: weak < 220, medium 220–299, strong ≥ 300. */
export function flourTier(w: number): Tier {
  if (w < 220) return "weak";
  if (w < 300) return "medium";
  return "strong";
}

export interface Protocol {
  level: Level;
  method: "direct" | "direct_cold" | "biga";
  hydra: number;
  hours: number;
  fridgeH: number;
  yeastPct: number;
  bigaPct: number;
  bigaH: number;
}

const BASE: Record<Tier, Record<Level, Omit<Protocol, "level">>> = {
  weak: {
    debutant: { method: "direct", hydra: 56, hours: 4, fridgeH: 0, yeastPct: 1, bigaPct: 0, bigaH: 0 },
    intermediaire: { method: "direct", hydra: 58, hours: 8, fridgeH: 0, yeastPct: 0.3, bigaPct: 0, bigaH: 0 },
    avance: { method: "direct_cold", hydra: 62, hours: 12, fridgeH: 8, yeastPct: 0.25, bigaPct: 0, bigaH: 0 },
  },
  medium: {
    debutant: { method: "direct", hydra: 58, hours: 6, fridgeH: 0, yeastPct: 0.6, bigaPct: 0, bigaH: 0 },
    intermediaire: { method: "direct_cold", hydra: 63, hours: 24, fridgeH: 18, yeastPct: 0.2, bigaPct: 0, bigaH: 0 },
    avance: { method: "biga", hydra: 68, hours: 30, fridgeH: 0, yeastPct: 1, bigaPct: 50, bigaH: 16 },
  },
  strong: {
    debutant: { method: "direct", hydra: 60, hours: 8, fridgeH: 0, yeastPct: 0.3, bigaPct: 0, bigaH: 0 },
    intermediaire: { method: "direct_cold", hydra: 66, hours: 24, fridgeH: 18, yeastPct: 0.2, bigaPct: 0, bigaH: 0 },
    avance: { method: "biga", hydra: 80, hours: 30, fridgeH: 0, yeastPct: 1, bigaPct: 80, bigaH: 24 },
  },
};

const STYLE_HYDRA: Record<BStyle, number> = { napo: 0, teglia: 6, rapide: -2 };

/** Three windows, strictly bounded by the flour's physiological limits. */
export function protocolsFor(flour: FlourRef, style: BStyle): Protocol[] {
  const tier = flourTier(flour.w);
  const maxHydra = tier === "weak" ? Math.min(62, flour.hydrMax) : flour.hydrMax;
  const maxHours = tier === "weak" ? 12 : tier === "medium" ? 36 : 72;
  return (["debutant", "intermediaire", "avance"] as Level[]).map((level) => {
    const b = { ...BASE[tier][level] };
    // A 24 h / 80 % biga is reserved for strong flours that can carry it.
    if (b.method === "biga" && flour.hydrMax < 75) { b.bigaPct = 50; b.bigaH = 16; }
    let hydra = Math.round(b.hydra + STYLE_HYDRA[style]);
    if (level === "debutant") hydra = Math.min(hydra, flour.hydrMin + 2);
    hydra = Math.max(flour.hydrMin - 2, Math.min(maxHydra, hydra));
    let hours = Math.min(maxHours, b.hours);
    if (style === "rapide") hours = Math.min(hours, level === "avance" ? hours : 6);
    return { level, ...b, hydra, hours };
  });
}

export function flourWarning(flour: FlourRef): string | null {
  const t = flourTier(flour.w);
  if (t === "weak") return `Note : cette farine (W${flour.w}) limite l'hydratation à 62 % max et la fermentation à 12 h pour éviter une pâte collante qui se déchire. Pas de Biga possible.`;
  if (t === "medium") return `Note : farine de force moyenne (W${flour.w}) — Biga légère uniquement (50 %, 16 h), hydratation plafonnée à ${flour.hydrMax} %.`;
  return null;
}
