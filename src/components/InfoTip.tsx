import { type ReactNode } from "react";
import { Info } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Pedagogical "(i)" affordance: opens an iOS-style bottom sheet with a drag
 * handle explaining the parameter in beginner-friendly terms.
 */
export function InfoTip({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-primary hover:opacity-70 transition-opacity align-middle"
          aria-label={label ?? "info"}
        >
          <Info className="size-4" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="rounded-t-3xl">
        <div className="mx-auto w-full max-w-lg px-5 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-xl font-bold tracking-tight">{label ?? "Info"}</DrawerTitle>
          </DrawerHeader>
          <div className="rounded-2xl bg-secondary p-4 text-[15px] leading-relaxed text-foreground">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
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
