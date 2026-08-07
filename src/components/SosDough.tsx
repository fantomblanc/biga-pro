import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";
import { LifeBuoy } from "lucide-react";

interface SosCase {
  id: string;
  titleKey: string;
  causeKey: string;
  actionKeys: string[];
}

const SOS_CASES: SosCase[] = [
  {
    id: "sticky",
    titleKey: "sos_sticky_title",
    causeKey: "sos_sticky_cause",
    actionKeys: ["sos_sticky_a1", "sos_sticky_a2", "sos_sticky_a3"],
  },
  {
    id: "overferm",
    titleKey: "sos_overferm_title",
    causeKey: "sos_overferm_cause",
    actionKeys: ["sos_overferm_a1", "sos_overferm_a2", "sos_overferm_a3"],
  },
  {
    id: "flat",
    titleKey: "sos_flat_title",
    causeKey: "sos_flat_cause",
    actionKeys: ["sos_flat_a1", "sos_flat_a2", "sos_flat_a3"],
  },
];

/** Emergency dough troubleshooting: diagnosis + immediate corrective actions. */
export function SosDough({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
            aria-label={t("sos_button")}
          >
            <LifeBuoy className="size-4 shrink-0" />
            <span className="hidden sm:inline">🆘 {t("sos_button")}</span>
            <span className="sm:hidden">🆘 {t("sos_short")}</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">🆘 {t("sos_button")}</DialogTitle>
          <DialogDescription>{t("sos_desc")}</DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible className="space-y-2">
          {SOS_CASES.map((c) => (
            <AccordionItem key={c.id} value={c.id} className="rounded-lg border border-border/60 px-3">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left">
                {t(c.titleKey)}
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t(c.causeKey)}</p>
                <ol className="space-y-1.5">
                  {c.actionKeys.map((k, i) => (
                    <li key={k} className="flex gap-2 text-xs leading-relaxed">
                      <span className="grid place-items-center size-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span>{t(k)}</span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}
