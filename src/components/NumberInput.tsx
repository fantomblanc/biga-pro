import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  value: number;
  onChange: (v: number) => void;
  /** Applied only when the field holds a valid number (never while typing). */
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  /** Value used when the user clears the field and leaves it empty. */
  fallback?: number;
  placeholder?: string;
  "aria-label"?: string;
}

/**
 * Numeric input that can be fully cleared.
 *
 * The visible text is kept in a local string buffer so backspacing to an empty
 * field never produces NaN, never snaps back to 0 and never fights the user
 * while typing (e.g. typing "450" in the oven temperature field). Clamping to
 * min/max happens on blur only.
 */
export function NumberInput({
  value, onChange, min, max, step = 1, className, fallback, placeholder, ...rest
}: Props) {
  const [text, setText] = useState<string>(String(value));
  const [focused, setFocused] = useState(false);

  // Keep in sync with external updates (sliders, presets, wizard) while idle.
  useEffect(() => {
    if (!focused && Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  const bump = (dir: 1 | -1) => {
    let v = Math.round((value + dir * step) * 100) / 100;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    setText(String(v));
    onChange(v);
  };
  const stepBtn =
    "grid place-items-center size-8 shrink-0 rounded-full bg-secondary text-primary text-lg font-semibold active:scale-90 transition-transform no-print";

  return (
    <div className="flex items-center gap-2">
    <button type="button" aria-label="−" className={stepBtn} onClick={() => bump(-1)}>−</button>
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      step={step}
      className={className}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        const n = Number(text);
        if (text === "" || !Number.isFinite(n)) {
          const f = fallback ?? min ?? 0;
          setText(String(f));
          onChange(f);
          return;
        }
        let v = n;
        if (min !== undefined) v = Math.max(min, v);
        if (max !== undefined) v = Math.min(max, v);
        setText(String(v));
        if (v !== value) onChange(v);
      }}
    />
    <button type="button" aria-label="+" className={stepBtn} onClick={() => bump(1)}>+</button>
    </div>
  );
}
