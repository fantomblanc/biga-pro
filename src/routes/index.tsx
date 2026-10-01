import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { loadActiveId, type SavedRecipe } from "@/lib/storage";
import { listRecipes, removeRecipe } from "@/lib/cloud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Plus, Trash2, ArrowRight, Clock, Scale, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: listRecipes,
    enabled: !!user,
  });

  useEffect(() => {
    setActiveIdState(loadActiveId());
  }, []);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const active = recipes.find((r) => r.id === activeId) ?? null;

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground text-center py-8">…</p>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Card className="p-6 grain-bg border-dashed text-center space-y-4">
            <span className="grid place-items-center size-12 rounded-xl ember-gradient shadow-lg shadow-primary/30 mx-auto">
              <Flame className="size-6 text-primary-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">{t("auth_required")}</p>
            <Button asChild size="lg" className="font-semibold">
              <Link to="/auth">{t("auth_sign_in")}</Link>
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Active session hero */}
        <section>
          <SectionHeader
            title={t("active_session")}
            icon={<Flame className="size-4 text-primary" />}
          />
          {active ? (
            <ActiveHero recipe={active} />
          ) : (
            <Card className="p-6 grain-bg border-dashed">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">{t("no_active_session")}</p>
                <Button asChild size="lg" className="font-semibold">
                  <Link to="/new">
                    <Plus className="size-4 mr-1" /> {t("create_recipe")}
                  </Link>
                </Button>
              </div>
            </Card>
          )}
        </section>

        {/* Journal link */}
        <section>
          <Card className="p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <span className="font-display font-semibold text-sm">{t("journal_history")}</span>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/journal">
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        </section>

        {/* Saved recipes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title={t("saved_recipes")} icon={<Scale className="size-4 text-primary" />} noMargin />
            <Button asChild size="sm" variant="ghost">
              <Link to="/new"><Plus className="size-4 mr-1" />{t("nav_new")}</Link>
            </Button>
          </div>
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("no_saved")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recipes.map((r) => (
                <RecipeCard
                  key={r.id}
                  r={r}
                  isActive={r.id === activeId}
                  onDelete={() => deleteMutation.mutate(r.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SectionHeader({ title, icon, noMargin }: { title: string; icon: React.ReactNode; noMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${noMargin ? "" : "mb-3"}`}>
      {icon}
      <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
    </div>
  );
}

function ActiveHero({ recipe }: { recipe: SavedRecipe }) {
  const { t } = useI18n();
  const next = recipe.timeline.find((s) => new Date(s.timeISO).getTime() > Date.now());
  return (
    <Card className="p-5 border-primary/30 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 size-40 rounded-full ember-gradient opacity-20 blur-2xl" />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
          {t(recipe.inputs.engine === "biga" ? "engine_biga" : "engine_direct")}
        </div>
        <h3 className="font-display text-xl font-bold">{recipe.name}</h3>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Scale className="size-3.5" /> {Math.round(recipe.calc.totalDough)} {t("grams")}</span>
          <span>·</span>
          <span>{recipe.inputs.ballsCount} × {recipe.inputs.ballWeight}{t("grams")}</span>
          <span>·</span>
          <span>{recipe.inputs.hydration}%</span>
        </div>
        {next && (
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("next_step")}</div>
              <div className="text-sm font-medium mt-0.5">{t(next.labelKey)}</div>
              <div className="tabular text-xs text-primary mt-0.5 flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(next.timeISO).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/recipe/$id" params={{ id: recipe.id }}>
                Open <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
        {!next && (
          <Button asChild size="sm" className="mt-4">
            <Link to="/recipe/$id" params={{ id: recipe.id }}>Open <ArrowRight className="size-4 ml-1" /></Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

function RecipeCard({ r, isActive, onDelete }: { r: SavedRecipe; isActive: boolean; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <Card className={`p-4 hover:border-primary/40 transition-colors ${isActive ? "border-primary/60" : ""}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold">
            {t(r.inputs.engine === "biga" ? "engine_biga" : "engine_direct")}
          </div>
          <h4 className="font-display font-semibold text-base truncate mt-0.5">{r.name}</h4>
          <div className="tabular text-xs text-muted-foreground mt-1">
            {r.inputs.ballsCount} × {r.inputs.ballWeight}{t("grams")} · {r.inputs.hydration}%
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors -mr-1 -mt-1"
          aria-label={t("delete")}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString()}
        </span>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link to="/recipe/$id" params={{ id: r.id }}>
            Open <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
