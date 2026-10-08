import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { usePlanAccess, UpgradeProModal } from "@/lib/plan";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { listBakeLogs, saveBakeLog, removeBakeLog, uploadPhoto, photoUrl, type BakeLog } from "@/lib/cloud";
import { newId } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2, Copy, Camera, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Bake journal · CarpiBiga Pro" },
      { name: "description", content: "History and bake journal — rate your crumb, chew and cornicione, and duplicate past recipes." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const { canUsePro } = usePlanAccess();

  if (loading) return <AppShell><p className="text-sm text-muted-foreground text-center py-8">…</p></AppShell>;

  if (!canUsePro) {
    return <AppShell><UpgradeProModal open onOpenChange={() => history.back()} /></AppShell>;
  }

  if (!user) {
    return (
      <AppShell>
        <Card className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t("auth_required")}</p>
          <Button asChild size="sm">
            <Link to="/auth">{t("auth_sign_in")}</Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <JournalContent />
    </AppShell>
  );
}

function JournalContent() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["bake-logs"],
    queryFn: listBakeLogs,
  });

  const [comment, setComment] = useState("");
  const [crumb, setCrumb] = useState(0);
  const [chew, setChew] = useState(0);
  const [cornicione, setCornicione] = useState(0);
  const [files, setFiles] = useState<File[]>([]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const id = newId();
      const photoPaths: string[] = [];
      for (const f of files) {
        try {
          photoPaths.push(await uploadPhoto(id, f));
        } catch {
          // skip failed upload
        }
      }
      const entry: BakeLog = {
        id,
        recipeName: t("journal_new_entry"),
        ratingCrumb: crumb || null,
        ratingChew: chew || null,
        ratingCornicione: cornicione || null,
        comment,
        photos: photoPaths,
      };
      return saveBakeLog(entry);
    },
    onSuccess: () => {
      toast.success(t("journal_saved"));
      setComment("");
      setCrumb(0);
      setChew(0);
      setCornicione(0);
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["bake-logs"] });
    },
    onError: () => toast.error(t("cloud_error")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeBakeLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bake-logs"] }),
  });

  function duplicate(log: BakeLog) {
    if (!log.recipeSnapshot) return;
    sessionStorage.setItem("carpibiga_prefill", JSON.stringify(log.recipeSnapshot));
    window.location.href = `/new?from=${log.id ?? ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-primary" />
        <h1 className="font-display text-xl font-bold">{t("journal_history")}</h1>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-display font-semibold text-sm">{t("journal_new_entry")}</h2>
        <StarRow label={t("journal_rating_crumb")} value={crumb} onChange={setCrumb} />
        <StarRow label={t("journal_rating_chew")} value={chew} onChange={setChew} />
        <StarRow label={t("journal_rating_cornicione")} value={cornicione} onChange={setCornicione} />
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{t("journal_comment")}</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("journal_comment_placeholder")}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Camera className="size-3.5" /> {t("journal_photos")}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-xs"
          />
        </div>
        <Button
          size="sm"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="w-full font-semibold"
        >
          {t("journal_save")}
        </Button>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("journal_empty")}</p>
        ) : (
          logs.map((log) => (
            <LogCard key={log.id} log={log} onDelete={() => log.id && deleteMutation.mutate(log.id)} onDuplicate={() => duplicate(log)} />
          ))
        )}
      </div>
    </div>
  );
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} type="button">
            <Star className={`size-4 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function LogCard({ log, onDelete, onDuplicate }: { log: BakeLog; onDelete: () => void; onDuplicate: () => void }) {
  const { t } = useI18n();
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(log.photos.map((p) => photoUrl(p).catch(() => null))).then((res) => {
      if (!cancelled) setUrls(res.filter((u): u is string => !!u));
    });
    return () => {
      cancelled = true;
    };
  }, [log.photos]);

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-sm">{log.recipeName}</div>
          {log.bakedAt && (
            <div className="text-xs text-muted-foreground">{new Date(log.bakedAt).toLocaleDateString()}</div>
          )}
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label={t("journal_delete")}>
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <RatingDisplay label={t("journal_rating_crumb")} value={log.ratingCrumb} />
        <RatingDisplay label={t("journal_rating_chew")} value={log.ratingChew} />
        <RatingDisplay label={t("journal_rating_cornicione")} value={log.ratingCornicione} />
      </div>
      {log.comment && <p className="text-sm text-muted-foreground">{log.comment}</p>}
      {urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {urls.map((u, i) => (
            <img key={i} src={u} alt="" className="size-16 rounded-md object-cover" />
          ))}
        </div>
      )}
      {Boolean(log.recipeSnapshot) && (
        <Button size="sm" variant="ghost" onClick={onDuplicate} className="text-xs">
          <Copy className="size-3.5 mr-1" /> {t("journal_duplicate")}
        </Button>
      )}
    </Card>
  );
}

function RatingDisplay({ label, value }: { label: string; value?: number | null }) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1">
      {label}: <Star className="size-3 fill-primary text-primary" /> {value}
    </span>
  );
}
