import { useMemo, useState } from "react";
import { Copy, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Style = "napo" | "teglia" | "rapide";
const STYLES: Record<Style, { icon: string; label: string; desc: string; hydra: number; salt: number; yeast22: number; rest: string }> = {
  napo: { icon: "🍕", label: "Napolitaine classique", desc: "Pâte souple, bords gonflés", hydra: 65, salt: 2.8, yeast22: 0.2, rest: "≈ 10 h à température ambiante" },
  teglia: { icon: "🟧", label: "Pizza plaque / Teglia", desc: "Moelleuse, cuite sur plaque", hydra: 75, salt: 2.5, yeast22: 0.3, rest: "≈ 8 h à température ambiante" },
  rapide: { icon: "⚡", label: "Pizza rapide", desc: "Prête le jour même", hydra: 62, salt: 2.5, yeast22: 1.0, rest: "≈ 3 h à température ambiante" },
};

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

export function BeginnerCalculator() {
  const [step, setStep] = useState(1);
  const [style, setStyle] = useState<Style>("napo");
  const [balls, setBalls] = useState(4);
  const [weight, setWeight] = useState(260);
  const [hydra, setHydra] = useState(65);
  const [room, setRoom] = useState(22);
  const cfg = STYLES[style];

  const r = useMemo(() => beginnerRecipe(balls, weight, hydra, cfg.salt, beginnerYeastPct(cfg.yeast22, room)), [balls, weight, hydra, room, cfg]);
  const rows: [string, string][] = [
    ["Farine", `${Math.round(r.flour)} g`],
    ["Eau", `${Math.round(r.water)} g`],
    ["Sel", `${r.salt.toFixed(1)} g`],
    ["Levure fraîche", `${r.yeast.toFixed(1)} g`],
  ];
  const copy = () => {
    navigator.clipboard.writeText(`${cfg.label} — ${balls} pâtons de ${weight} g\n` + rows.map(([k, v]) => `${k} : ${v}`).join("\n"));
    toast.success("Ingrédients copiés");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />)}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Quelle pizza voulez-vous faire ?</h2>
          {(Object.keys(STYLES) as Style[]).map((k) => (
            <button key={k} type="button" onClick={() => { setStyle(k); setHydra(STYLES[k].hydra); setStep(2); }}
              className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition ${style === k ? "border-primary bg-primary/10" : "border-border/60 bg-card"}`}>
              <span className="text-3xl">{STYLES[k].icon}</span>
              <span><span className="block font-semibold">{STYLES[k].label}</span><span className="text-sm text-muted-foreground">{STYLES[k].desc}</span></span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Combien de pizzas ?</h2>
          <Stepper label="Nombre de pâtons" value={balls} onChange={setBalls} step={1} min={1} max={40} />
          <Stepper label="Poids par pâton" value={weight} onChange={setWeight} step={10} min={150} max={600} unit="g" />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Texture et cuisine</h2>
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            <div className="flex justify-between"><span className="font-medium">Quantité d'eau</span><span className="font-bold text-primary">{hydra}%</span></div>
            <Slider min={55} max={80} step={1} value={[hydra]} onValueChange={([v]) => setHydra(v)} />
            <p className="text-xs text-muted-foreground">Recommandé : {cfg.hydra}% · plus d'eau = pâte plus légère mais plus collante</p>
          </div>
          <Stepper label="Température de la pièce" value={room} onChange={setRoom} step={1} min={15} max={32} unit="°C" />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Vos ingrédients</h2>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between p-4"><span>{k}</span><span className="tabular text-lg font-bold">{v}</span></div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Mélangez tout, pétrissez 10 min, laissez reposer {cfg.rest}, puis formez vos boules.</p>
          <Button className="w-full" onClick={copy}><Copy className="size-4" /> Copier la liste</Button>
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>Retour</Button>}
        {step > 1 && step < 4 && <Button className="flex-1" onClick={() => setStep(step + 1)}>Suivant</Button>}
        {step === 4 && <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>Recommencer</Button>}
      </div>
    </div>
  );
}
