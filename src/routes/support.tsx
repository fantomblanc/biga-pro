import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAppSettings } from "@/lib/app-settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Coffee, Handshake, Bug, Send } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Soutenir & Contact · CarpiBiga Pro" },
      { name: "description", content: "Soutenez CarpiBiga Pro, proposez un partenariat ou signalez un bug." },
      { property: "og:title", content: "Soutenir & Contact · CarpiBiga Pro" },
      { property: "og:description", content: "Dons, partenariats et retours pour CarpiBiga Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

const schema = z.object({
  type: z.enum(["bug", "suggestion", "autre"]),
  message: z.string().trim().min(1, "Message requis").max(5000),
  user_email: z.string().trim().email("Email invalide").max(255).optional().or(z.literal("")),
});

function SupportPage() {
  const s = useAppSettings();
  const [type, setType] = useState<"bug" | "suggestion" | "autre">("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const paypal = `https://www.paypal.com/donate?business=${encodeURIComponent(s.paypal_email)}&currency_code=EUR`;
  const bmc = s.buy_me_a_coffee_username ? `https://www.buymeacoffee.com/${encodeURIComponent(s.buy_me_a_coffee_username)}` : "";
  const mail = (subject: string) => `mailto:${s.contact_email}?subject=${encodeURIComponent(subject)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ type, message, user_email: email });
    if (!r.success) return toast.error(r.error.issues[0].message);
    setSending(true);
    const { error } = await (supabase as any).from("feedback_reports").insert({
      type, message: r.data.message, user_email: r.data.user_email || null,
    });
    setSending(false);
    if (error) return toast.error("Envoi impossible, réessayez.");
    toast.success("Merci ! Votre retour a été envoyé.");
    setMessage(""); setEmail("");
  };

  const card = "rounded-2xl border border-border/60 bg-card p-4 space-y-3";
  const btn = "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground active:opacity-70 disabled:opacity-50";
  const btn2 = "flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground active:opacity-70";

  return (
    <AppShell>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-4">Soutenir & Contact</h1>
      <div className="space-y-4">
        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Heart className="size-5 text-primary" />Soutenir l'application</h2>
          <p className="text-sm text-muted-foreground">{s.app_name} est gratuit. Un petit don aide à le faire évoluer.</p>
          <a href={paypal} target="_blank" rel="noopener noreferrer" className={btn}>Faire un don PayPal</a>
          {bmc && <a href={bmc} target="_blank" rel="noopener noreferrer" className={btn2}><Coffee className="size-5" />Offrez-moi un café</a>}
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Handshake className="size-5 text-primary" />Partenariats & Publicité</h2>
          <p className="text-sm text-muted-foreground">Nous recherchons des partenaires : marques de farine, fours à pizza, matériel spécialisé, ainsi que des annonceurs pour des emplacements publicitaires.</p>
          <a href={mail("Proposition de partenariat / Publicité - Biga Pro")} className={btn2}>Proposer un partenariat</a>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Bug className="size-5 text-primary" />Bugs & Suggestions</h2>
          <a href={mail("[Bug/Suggestion] Biga Pro")} className={btn2}>Écrire un email</a>
          <form onSubmit={submit} className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {(["bug", "suggestion", "autre"] as const).map((k) => (
                <button type="button" key={k} onClick={() => setType(k)}
                  className={`rounded-lg py-1.5 text-sm font-medium capitalize ${type === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                  {k === "bug" ? "Bug" : k === "suggestion" ? "Suggestion" : "Autre"}
                </button>
              ))}
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} rows={5}
              placeholder="Votre message…" className="w-full rounded-xl border border-input bg-background p-3 text-base" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
              placeholder="Votre email (optionnel)" className="w-full rounded-xl border border-input bg-background p-3 text-base" />
            <button disabled={sending} className={btn}><Send className="size-4" />{sending ? "Envoi…" : "Envoyer"}</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
