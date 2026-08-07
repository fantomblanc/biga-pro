import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FLOURS, FLOUR_SORTS, FLOUR_SORT_LABEL_KEY, searchFlours, sortFlours,
  type FlourRef, type FlourSort,
} from "@/lib/flours";
import { Check, ChevronsUpDown, Search } from "lucide-react";

const MANUAL = "__manual__";

interface Props {
  value: string; // flour id or "" / "__manual__" for a custom flour
  onChange: (id: string, flour: FlourRef | null) => void;
  label?: string;
}

/** Searchable flour combobox with dynamic sorting and a manual-entry escape hatch. */
export function FlourSelect({ value, onChange, label }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FlourSort>("brand");

  const results = useMemo(() => sortFlours(searchFlours(FLOURS, query), sort), [query, sort]);
  const selected = FLOURS.find((f) => f.id === value) ?? null;

  const pick = (id: string) => {
    setOpen(false);
    setQuery("");
    if (id === MANUAL) return onChange(MANUAL, null);
    onChange(id, FLOURS.find((f) => f.id === id) ?? null);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label ?? t("flour_select")}
      </Label>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-10 flex-1 justify-between gap-2 text-left font-normal"
            >
              <span className="truncate text-xs">
                {selected ? (
                  <>
                    <span className="font-semibold uppercase">{selected.brand}</span>
                    <span className="text-muted-foreground"> - {selected.name}</span>
                  </>
                ) : (
                  t("flour_manual")
                )}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(92vw,26rem)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("flour_search_placeholder")}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>{t("flour_search_empty")}</CommandEmpty>
                <CommandGroup heading={`${results.length} ${t("flour_results")}`}>
                  {results.map((f) => (
                    <CommandItem key={f.id} value={f.id} onSelect={() => pick(f.id)}>
                      <Check className={`mr-2 size-3.5 ${value === f.id ? "opacity-100 text-primary" : "opacity-0"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">
                          <span className="font-semibold uppercase">{f.brand}</span>
                          <span className="text-muted-foreground"> - {f.name}</span>
                        </div>
                        <div className="tabular text-[10px] text-muted-foreground">
                          W{f.w} | {f.protein}g prot · {t(f.useKey)}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              <button
                type="button"
                onClick={() => pick(MANUAL)}
                className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-xs hover:bg-accent"
              >
                <Search className="size-3.5 opacity-60" />
                {t("flour_manual")}
              </button>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={sort} onValueChange={(v) => setSort(v as FlourSort)}>
          <SelectTrigger className="h-10 w-[8.5rem] text-xs" aria-label={t("flour_sort_by")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FLOUR_SORTS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {t(FLOUR_SORT_LABEL_KEY[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <p className="text-[11px] text-muted-foreground tabular">
          W{selected.w} | {selected.protein}g prot · {t(selected.useKey)} ·{" "}
          {t("flour_hydration_hint")
            .replace("{min}", String(selected.hydrMin))
            .replace("{max}", String(selected.hydrMax))}
        </p>
      )}
    </div>
  );
}
