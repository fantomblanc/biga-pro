import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { getSharedRecipe } from "@/lib/cloud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Flame, Clock } from "lucide-react";

export const Route = createFileRoute("/share/$token")({
  head: () => ({
    meta: [
      { title: "Shared recipe · CarpiBiga Pro" },
      { name: "description", content: "A shared, read-only dough recipe from CarpiBiga Pro." },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { t } = useI18n();
  const { token } = Route.useParams();
  const { data: recipe, isLoading } = useQuery({
    queryKey: ["shared-recipe", token],
    queryFn: () => getSharedRecipe(token),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="text-center text-[10px] uppercase tracking-widest text-primary font-bold">
          {t("share_readonly")}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">…</p>
        ) : !recipe ? (
          <Card className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">{t("recipe_not_found")}</p>
            <Button asChild size="sm">
              <Link to="/">{t("share_view_own")}</Link>
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-5 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 size-40 rounded-full ember-gradient opacity-20 blur-2xl" />
              <div className="relative space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                  <Flame className="size-3.5" />
                  {t(recipe.inputs.engine === "biga" ? "engine_biga" : "engine_direct")}
                </div>
                <h1 className="font-display text-2xl font-bold">{recipe.name}</h1>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Scale className="size-3.5" /> {Math.round(recipe.calc.totalDough)} {t("grams")}</span>
                  <span>·</span>
                  <span>{recipe.inputs.ballsCount} × {recipe.inputs.ballWeight}{t("grams")}</span>
                  <span>·</span>
                  <span>{recipe.inputs.hydration}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t("ingredients")}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm tabular">
                <Row label={t("total_flour")} value={`${Math.round(recipe.calc.totalFlour)} ${t("grams")}`} />
                <Row label={t("total_water")} value={`${Math.round(recipe.calc.totalWater)} ${t("grams")}`} />
                <Row label={t("total_salt")} value={`${recipe.calc.totalSalt.toFixed(1)} ${t("grams")}`} />
                <Row label={t("total_dough")} value={`${Math.round(recipe.calc.totalDough)} ${t("grams")}`} />
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t("protocol")}</h2>
              <div className="space-y-2">
                {recipe.timeline.map((step) => (
                  <div key={step.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0">
                    <span>{t(step.labelKey)}</span>
                    <span className="flex items-center gap-1 text-muted-foreground tabular">
                      <Clock className="size-3" />
                      {new Date(step.timeISO).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {recipe.notes && (
              <Card className="p-4 space-y-2">
                <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">{t("notes")}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{recipe.notes}</p>
              </Card>
            )}

            <div className="text-center">
              <Button asChild size="sm" variant="outline">
                <Link to="/">{t("share_view_own")}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
