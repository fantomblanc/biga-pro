import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { changelogsOptions } from "@/lib/changelogs";
import { publishChangelog } from "@/lib/changelogs.functions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
const empty = () => ({ version: "", date: format(new Date(), "yyyy-MM-dd"), title_fr: "", content_fr: "", title_nl: "", content_nl: "" });
export function ChangelogAdmin() {
  const { data: rows = [], isError } = useQuery(changelogsOptions);
  const [draft, setDraft] = useState<{ id?: string; version: string; date: string; title_fr: string; content_fr: string; title_nl: string; content_nl: string }>(empty);
  const [busy, setBusy] = useState(false);
  const publish = useServerFn(publishChangelog);
  const qc = useQueryClient();
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await publish({ data: draft }); if (!r.ok) { toast.error(r.error); return; } await qc.invalidateQueries({ queryKey: ["changelogs"] }); setDraft(empty()); toast.success("Note de version enregistrée"); }
    catch { toast.error("Échec de l’enregistrement"); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("changelogs").delete().eq("id", id);
    if (error) { toast.error("Échec de la suppression"); return; }
    await qc.invalidateQueries({ queryKey: ["changelogs"] }); toast.success("Note supprimée");
  };
  return <section className="space-y-4 py-4 border-t border-border">
    <h2 className="text-lg font-semibold">Changelog / Mises à jour</h2>
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Version<Input required value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} /></label>
      <div className="text-sm">Date<Popover><PopoverTrigger asChild><Button variant="outline" className="w-full">{draft.date}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar className="pointer-events-auto" mode="single" selected={new Date(`${draft.date}T12:00:00`)} onSelect={(d) => d && setDraft({ ...draft, date: format(d, "yyyy-MM-dd") })} /></PopoverContent></Popover></div></div>
      <label className="block text-sm">Titre FR<Input required value={draft.title_fr} onChange={(e) => setDraft({ ...draft, title_fr: e.target.value })} /></label>
      <label className="block text-sm">Contenu FR<Textarea required rows={4} value={draft.content_fr} onChange={(e) => setDraft({ ...draft, content_fr: e.target.value })} /></label>
      <label className="block text-sm">Titre NL (facultatif)<Input value={draft.title_nl} onChange={(e) => setDraft({ ...draft, title_nl: e.target.value })} /></label>
      <label className="block text-sm">Contenu NL (facultatif)<Textarea rows={3} value={draft.content_nl} onChange={(e) => setDraft({ ...draft, content_nl: e.target.value })} /></label>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} type="submit">{busy ? "Traduction…" : "Traduire et publier"}</Button><Button type="button" variant="ghost" onClick={() => setDraft(empty())}><Plus className="size-4" />Nouvelle note</Button></div>
    </form>
    {isError && <p role="alert" className="text-destructive">Impossible de charger les notes.</p>}
    <div className="divide-y divide-border">{rows.map((r) => <article key={r.id} className="py-4 space-y-2"><p className="text-xs text-primary">{r.version} · {new Date(`${r.date}T12:00:00`).toLocaleDateString("fr")}</p><h3 className="font-semibold">{r.title_fr}</h3><p className="text-sm whitespace-pre-wrap">{r.content_fr}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setDraft({ id: r.id, version: r.version, date: r.date, title_fr: r.title_fr, content_fr: r.content_fr, title_nl: r.title_nl, content_nl: r.content_nl })}><Pencil className="size-4" />Modifier</Button>
      <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label="Supprimer la note"><Trash2 className="size-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle><AlertDialogDescription>{r.version} · {r.title_fr}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => remove(r.id)}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div></article>)}</div>
  </section>;
}