import { useI18n } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FLOURS, FLOURS_BY_CATEGORY, type FlourRef } from "@/lib/flours";

const MANUAL = "__manual__";

interface Props {
  value: string; // flour id or "__manual__"
  onChange: (id: string, flour: FlourRef | null) => void;
}

export function FlourSelect({ value, onChange }: Props) {
  const { t } = useI18n();

  const handle = (id: string) => {
    if (id === MANUAL) return onChange(MANUAL, null);
    const f = FLOURS.find((x) => x.id === id) ?? null;
    onChange(id, f);
  };

  const selected = FLOURS.find((f) => f.id === value) ?? null;

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("flour_select")}
      </Label>
      <Select value={value || MANUAL} onValueChange={handle}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MANUAL}>{t("flour_manual")}</SelectItem>
          <SelectGroup>
            <SelectLabel>{t("flour_cat_medium")}</SelectLabel>
            {FLOURS_BY_CATEGORY.medium.map(renderItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("flour_cat_strong")}</SelectLabel>
            {FLOURS_BY_CATEGORY.strong.map(renderItem)}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>{t("flour_cat_very_strong")}</SelectLabel>
            {FLOURS_BY_CATEGORY.very_strong.map(renderItem)}
          </SelectGroup>
        </SelectContent>
      </Select>
      {selected && (
        <p className="text-[11px] text-muted-foreground tabular">
          W{selected.w} · {t("flour_hydration_hint")
            .replace("{min}", String(selected.hydrMin))
            .replace("{max}", String(selected.hydrMax))}
        </p>
      )}
    </div>
  );
}

function renderItem(f: FlourRef) {
  return (
    <SelectItem key={f.id} value={f.id}>
      <span className="font-medium">{f.brand}</span>
      <span className="text-muted-foreground"> · {f.name}</span>
      <span className="tabular text-muted-foreground ml-1">(W{f.w})</span>
    </SelectItem>
  );
}
