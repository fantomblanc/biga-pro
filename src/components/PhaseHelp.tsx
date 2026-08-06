import { CircleHelp, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { type PhaseHelp as PhaseHelpData } from "@/lib/phase-help";

/**
 * Discrete "(i)" affordance next to a protocol step: opens a popover with a
 * visual reference (photo / illustration of the expected result) plus a short
 * checklist of what to look for and what to avoid.
 */
export function PhaseHelp({ help }: { help: PhaseHelpData }) {
  const { t } = useI18n();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t(help.titleKey)}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary/80 hover:text-primary hover:border-primary transition-colors no-print"
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[300px] p-0 overflow-hidden">
        <img
          src={help.media}
          alt={t(help.altKey)}
          loading="lazy"
          width={768}
          height={512}
          className="w-full h-32 object-cover"
        />
        <div className="p-3 space-y-2">
          <div className="font-display text-sm font-semibold">{t(help.titleKey)}</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{t(help.descKey)}</p>
          <ul className="space-y-1">
            {help.okKeys.map((k) => (
              <li key={k} className="flex gap-1.5 text-[11px] leading-snug">
                <Check className="size-3.5 shrink-0 mt-0.5 text-primary" />
                <span>{t(k)}</span>
              </li>
            ))}
            {help.avoidKeys.map((k) => (
              <li key={k} className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <X className="size-3.5 shrink-0 mt-0.5 text-destructive" />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
