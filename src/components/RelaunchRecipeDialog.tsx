import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Play, CalendarIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { setActiveId, type SavedRecipe } from "@/lib/storage";
import { saveRecipe } from "@/lib/cloud";
import { rescheduleRecipe, requiredDurationHours, scheduleCheck, expressRecipe } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { updatesCopy } from "@/lib/updates-copy";

export function RelaunchRecipeDialog({ recipe, onLaunched }: { recipe: SavedRecipe; onLaunched?: (r: SavedRecipe) => void }) {
  const { lang } = useI18n();
  const c = updatesCopy(lang);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date>();
  const [time, setTime] = useState("19:30");
  const [busy, setBusy] = useState(false);
  const [express, setExpress] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const target = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(time.split(":")[0]), Number(time.split(":")[1])) : null;
  const check = target && Number.isFinite(target.getTime()) ? scheduleCheck(requiredDurationHours(recipe), target.toISOString()) : null;
  const launch = async () => {
    if (!target || !check || (!express && !check.compatible)) return;
    setBusy(true);
    try {
      const updated = express ? expressRecipe(recipe, target.toISOString()) : rescheduleRecipe(recipe, target.toISOString());
      const saved = await saveRecipe(updated);
      setActiveId(saved.id);
      queryClient.setQueryData(["recipe", saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });
      onLaunched?.(saved);
      setOpen(false);
      toast.success(c.launched);
      await navigate({ to: "/recipe/$id", params: { id: saved.id } });
    } catch { toast.error(c.error); } finally { setBusy(false); }
  };
  return <>
    <Button variant="outline" size="sm" onClick={() => { const date = new Date(Date.now() + (requiredDurationHours(recipe) + 2) * 3600_000); setDay(date); setExpress(false); setOpen(true); }}><Play className="size-4" />{c.launch}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>{c.launch}</DialogTitle><DialogDescription>{recipe.name}</DialogDescription></DialogHeader>
      <div className="space-y-4"><p className="font-medium text-sm">{c.bake}</p>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Popover><PopoverTrigger asChild><Button variant="outline" aria-label={c.date}><CalendarIcon className="size-4" />{day?.toLocaleDateString(lang) ?? c.date}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={day} onSelect={(d) => { setDay(d); setExpress(false); }} className="pointer-events-auto" /></PopoverContent></Popover>
          <Input type="time" aria-label={c.time} value={time} onChange={(e) => { setTime(e.target.value); setExpress(false); }} />
        </div>
        {check && !check.compatible && !express && <div role="alert" className="rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive space-y-3">
          <p className="text-sm font-medium flex gap-2"><AlertTriangle className="size-5 shrink-0" />{c.blocked.replace("{required}", check.requiredH.toFixed(1)).replace("{available}", Math.max(0, check.availableH).toFixed(1))}</p>
          <Button variant="outline" className="w-full" onClick={() => { const later = new Date(Date.now() + (check.requiredH + 2) * 3600_000); setDay(later); setTime(`${String(later.getHours()).padStart(2, "0")}:${String(later.getMinutes()).padStart(2, "0")}`); }}>{c.later}</Button>
          <Button variant="outline" className="w-full" disabled={check.availableH < 4} onClick={() => setExpress(true)}>{c.express}</Button>
          {check.availableH < 4 && <p className="text-xs">{c.expressMin}</p>}
        </div>}
        {express && <p className="text-sm border border-primary rounded-lg p-3">{c.expressConfirm}</p>}
      </div><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{c.cancel}</Button><Button disabled={busy || !check || (!check.compatible && !express)} onClick={launch}><Play className="size-4" />{c.start}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}