import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { changelogsOptions, localizedChangelog } from "@/lib/changelogs";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { updatesCopy } from "@/lib/updates-copy";
export function WhatsNew() {
  const { lang } = useI18n(); const { user } = useAuth(); const c = updatesCopy(lang);
  const { data: rows = [], isError } = useQuery(changelogsOptions);
  const [open, setOpen] = useState(false); const [seen, setSeen] = useState("");
  const key = `carpibiga_updates_seen_${user?.id ?? "guest"}`;
  const latest = rows.map((r) => r.updated_at).sort().at(-1) ?? "";
  useEffect(() => { setSeen(localStorage.getItem(key) ?? ""); }, [key]);
  useEffect(() => { if (open && latest) { localStorage.setItem(key, latest); setSeen(latest); } }, [open, latest, key]);
  return <><Button variant="ghost" size="icon" className="relative shrink-0" aria-label={`${c.updates}${latest > seen ? ` · ${c.new}` : ""}`} title={c.updates} onClick={() => setOpen(true)}><Bell className="size-5" />{latest > seen && <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{c.updates}</DialogTitle><DialogDescription>{rows.length ? `${rows[0].version}` : c.empty}</DialogDescription></DialogHeader>
      {isError && <p role="alert" className="text-destructive">{c.error}</p>}
      <div className="divide-y divide-border">{rows.map((r) => { const entry = localizedChangelog(r, lang); return <article key={r.id} className="py-4 space-y-2"><p className="text-xs text-primary">{r.version} · {new Date(`${r.date}T12:00:00`).toLocaleDateString(lang)}</p><h3 className="font-semibold">{entry.title}</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{entry.content}</p></article>; })}</div>
    </DialogContent></Dialog></>;
}