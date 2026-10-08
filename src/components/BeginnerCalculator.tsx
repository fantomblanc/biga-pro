import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FLOURS, searchFlours, sortFlours, type FlourRef } from "@/lib/flours";
import { flourTier, flourWarning, protocolsFor, type BStyle, type Protocol } from "@/lib/beginner-rules";

const STYLES: Record<BStyle, { icon: string; label: string; desc: string }> = {
  napo: { icon: "🍕", label: "Napolitaine classique", desc: "Pâte souple, bords gonflés" },
  teglia: { icon: "🟧", label: "Pizza plaque / Teglia", desc: "Moelleuse, cuite sur plaque" },
  rapide: { icon: "⚡", label: "Pizza rapide", desc: "Prête le jour même" },
};
const LEVELS = {
  debutant: { title: "🟢 Débutant", sub: "Sécurité & simplicité" },
  intermediaire: { title: "🟡 Intermédiaire", sub: "Équilibre & arômes" },
  avance: { title: "🔴 Avancé", sub: "Potentiel maximum de la farine" },
};
const TIER_LABEL = { weak: "W faible", medium: "W moyen", strong: "W fort" };
const METHOD_LABEL = { direct: "Direct court", direct_cold: "Direct + frigo", biga: "Biga" };

/** Fresh yeast % adjusted for room temperature (halves every ~6°C warmer). */
export function beginnerYeastPct(base22: number, room: number) {
  return Math.max(0.05, base22 * Math.pow(2, (22 - room) / 6));
}

export function beginnerRecipe(balls: number, weight: number, hydra: number, salt: number, yeast: number) {
  const total = balls * weight;
  const flour = total / (1 + hydra / 100 + salt / 100 + yeast / 100);
  return { flour, water: (flour * hydra) / 100, salt: (flour * salt) / 100, yeast: (flour * yeast) / 100 };
}

function Stepper({ label, value, onChange, step, min, max, unit }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button size="icon" variant="secondary" aria-label="Moins" onClick={() => onChange(Math.max(min, value - step))}><Minus className="size-4" /></Button>
        <span className="tabular text-xl font-bold w-16 text-center">{value}{unit}</span>
        <Button size="icon" variant="secondary" aria-label="Plus" onClick={() => onChange(Math.min(max, value + step))}><Plus className="size-4" /></Button>
      </div>
    </div>
  );
}

function BrandBadge({ f }: { f: FlourRef }) {
  const initials = f.brand.replace(/\(.*\)/, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const t = flourTier(f.w);
  const cls = t === "weak" ? "bg-muted text-muted-foreground" : t === "medium" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground";
  return <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${cls}`}>{initials}</span>;
}

function buildSteps(p: Protocol, room: number): string[] {
  const s: string[] = [];
  if (p.method === "biga") {
    s.push(`Préparation (J-1) : mélangez la farine de Biga, son eau et la levure grossièrement (sans pétrir). Laissez ${p.bigaH} h à 16-18 °C.`);
    s.push("Pétrissage : dissolvez la Biga dans l'eau restante, ajoutez la farine restante, puis le sel en fin de pétrissage. Pétrissez 10-12 min jusqu'à pâte lisse.");
  } else {
    s.push(`Préparation : dissolvez la levure dans l'eau (eau fraîche si la pièce dépasse ${room} °C).`);
    s.push("Pétrissage : ajoutez la farine progressivement, puis le sel. Pétrissez 10 min jusqu'à pâte lisse.");
  }
  const restRoom = p.method === "biga" ? Math.max(2, p.hours - p.bigaH - 4) : p.hours - p.fridgeH;
  s.push(p.fridgeH > 0
    ? `Repos : 1 h à température ambiante, puis ${p.fridgeH} h au frigo (4 °C) dans une boîte fermée.`
    : `Repos : laissez la pâte couverte ${Math.max(1, Math.round(restRoom / 2))} h à température ambiante.`);
  s.push(p.fridgeH > 0
    ? "Boulage : sortez la pâte, formez les pâtons, puis laissez-les 3-4 h à température ambiante."
    : `Boulage : formez les pâtons et laissez-les reposer encore ${Math.max(1, Math.round(restRoom / 2))} h couverts.`);
  s.push("Cuisson : four le plus chaud possible (250-300 °C maison, 430 °C four à pizza), 60-90 s en four pizza, 6-8 min en four maison.");
  return s;
}

export function BeginnerCalculator() {
  const [step, setStep] = useState(1);
  const [style, setStyle] = useState<BStyle>("napo");
  const [flourId, setFlourId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [balls, setBalls] = useState(4);
  const [weight, setWeight] = useState(260);
  const [room, setRoom] = useState(22);
  const [levelIdx, setLevelIdx] = useState<number | null>(null);

  const flour = FLOURS.find((f) => f.id === flourId) ?? null;
  const list = useMemo(() => sortFlours(searchFlours(FLOURS, q), "w_asc"), [q]);
  const protocols = useMemo(() => (flour ? protocolsFor(flour, style) : []), [flour, style]);
  const p = levelIdx != null ? protocols[levelIdx] : null;

  const rows = useMemo<[string, string][]>(() => {
    if (!p) return [];
    const yeast = p.method === "biga" ? 0 : beginnerYeastPct(p.yeastPct, room);
    const salt = 2.8;
    const r = beginnerRecipe(balls, weight, p.hydra, salt, yeast);
    if (p.method !== "biga") return [["Farine", `${Math.round(r.flour)} g`], ["Eau", `${Math.round(r.water)} g`], ["Sel", `${r.salt.toFixed(1)} g`], ["Levure fraîche", `${r.yeast.toFixed(1)} g`]];
    const bf = (r.flour * p.bigaPct) / 100, bw = bf * 0.45, by = bf * 0.01;
    return [["Biga · farine", `${Math.round(bf)} g`], ["Biga · eau", `${Math.round(bw)} g`], ["Biga · levure fraîche", `${by.toFixed(1)} g`],
      ["Pétrissage · farine", `${Math.round(r.flour - bf)} g`], ["Pétrissage · eau", `${Math.round(r.water - bw)} g`], ["Pétrissage · sel", `${r.salt.toFixed(1)} g`]];
  }, [p, balls, weight, room]);

  const copy = () => {
    navigator.clipboard.writeText(`${STYLES[style].label} — ${balls} × ${weight} g (${flour?.brand} ${flour?.name})\n` + rows.map(([k, v]) => `${k} : ${v}`).join("\n"));
    toast.success("Ingrédients copiés");
  };
  const warn = flour ? flourWarning(flour) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">{[1, 2, 3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />)}</div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Quelle pizza voulez-vous faire ?</h2>
          {(Object.keys(STYLES) as BStyle[]).map((k) => (
            <button key={k} type="button" onClick={() => { setStyle(k); setLevelIdx(null); setStep(2); }}
              className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition ${style === k ? "border-primary bg-primary/10" : "border-border/60 bg-card"}`}>
              <span className="text-3xl">{STYLES[k].icon}</span>
              <span><span className="block font-semibold">{STYLES[k].label}</span><span className="text-sm text-muted-foreground">{STYLES[k].desc}</span></span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Votre farine et vos pâtons</h2>
          <Input placeholder="Rechercher une farine (marque, T55, W300…)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {list.map((f) => (
              <button key={f.id} type="button" onClick={() => { setFlourId(f.id); setLevelIdx(null); }}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition ${flourId === f.id ? "border-primary bg-primary/10" : "border-border/60 bg-card"}`}>
                <BrandBadge f={f} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.brand}</span><span className="block truncate text-sm text-muted-foreground">{f.name}</span></span>
                <span className="text-right text-xs"><span className="block font-bold">W{f.w}</span><span className="text-muted-foreground">{TIER_LABEL[flourTier(f.w)]}</span></span>
              </button>
            ))}
          </div>
          <Stepper label="Nombre de pâtons" value={balls} onChange={setBalls} step={1} min={1} max={40} />
          <Stepper label="Poids par pâton" value={weight} onChange={setWeight} step={10} min={150} max={600} unit="g" />
          <Stepper label="Température de la pièce" value={room} onChange={setRoom} step={1} min={15} max={32} unit="°C" />
        </div>
      )}

      {step === 3 && flour && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Choisissez votre niveau</h2>
          <p className="text-sm text-muted-foreground">Adapté à {flour.brand} {flour.name} (W{flour.w})</p>
          {warn && <div className="flex gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"><AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />{warn}</div>}
          <div className="grid gap-2">
            {protocols.map((pr, i) => (
              <button key={pr.level} type="button" onClick={() => setLevelIdx(i)}
                className={`rounded-2xl border p-4 text-left transition ${levelIdx === i ? "border-primary bg-primary/10" : "border-border/60 bg-card"}`}>
                <div className="flex justify-between"><span className="font-semibold">{LEVELS[pr.level].title}</span><span className="text-xs text-muted-foreground">{LEVELS[pr.level].sub}</span></div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {METHOD_LABEL[pr.method]}{pr.method === "biga" ? ` ${pr.bigaPct}% · ${pr.bigaH} h` : ""} · Hydratation {pr.hydra}% · Maturation {pr.hours} h
                </div>
              </button>
            ))}
          </div>

          {p && (
            <>
              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border">
                {rows.map(([k, v]) => <div key={k} className="flex justify-between p-4"><span>{k}</span><span className="tabular text-lg font-bold">{v}</span></div>)}
              </div>
              <ol className="space-y-2">
                {buildSteps(p, room).map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>{s}
                  </li>
                ))}
              </ol>
              <Button className="w-full" onClick={copy}><Copy className="size-4" /> Copier la liste</Button>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>Retour</Button>}
        {step === 2 && <Button className="flex-1" disabled={!flour} onClick={() => setStep(3)}>{flour ? "Suivant" : "Choisissez une farine"}</Button>}
        {step === 3 && <Button variant="secondary" className="flex-1" onClick={() => { setStep(1); setLevelIdx(null); }}>Recommencer</Button>}
      </div>
    </div>
  );
}
