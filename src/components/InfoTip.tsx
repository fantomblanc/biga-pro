import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia("(hover: none)").matches);
  }, []);
  return touch;
}

/**
 * Pedagogical "ℹ️" affordance: hover on desktop, tap on touch devices.
 * Explains what a parameter does, its impact on the dough, and why the app
 * suggests or constrains certain values.
 */
export function InfoTip({ children, label }: { children: ReactNode; label?: string }) {
  const touch = useIsTouch();

  const icon = (
    <span
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary/80 hover:text-primary hover:border-primary transition-colors cursor-help align-middle"
      aria-label={label ?? "info"}
      role="button"
      tabIndex={0}
    >
      <Info className="size-3" />
    </span>
  );

  const body = (
    <div className="text-[11.5px] leading-relaxed text-foreground/90 max-w-[280px]">{children}</div>
  );

  if (touch) {
    return (
      <Popover>
        <PopoverTrigger asChild>{icon}</PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[290px] p-3">
          {body}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{icon}</TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[300px] p-3 bg-popover text-popover-foreground border border-border">
          {body}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Label + info icon row, used for every key parameter. */
export function LabelWithInfo({
  label,
  info,
  className,
}: {
  label: string;
  info: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span>{label}</span>
      <InfoTip label={label}>{info}</InfoTip>
    </span>
  );
}
