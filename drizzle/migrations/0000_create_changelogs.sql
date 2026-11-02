CREATE TABLE public.changelogs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version text NOT NULL,
 date date NOT NULL DEFAULT CURRENT_DATE,
 title_fr text NOT NULL,
 content_fr text NOT NULL,
 title_nl text NOT NULL DEFAULT '',
 content_nl text NOT NULL DEFAULT '',
 translations jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.changelogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.changelogs TO authenticated;
GRANT ALL ON public.changelogs TO service_role;
ALTER TABLE public.changelogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY changelogs_public_read ON public.changelogs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY changelogs_admin_insert ON public.changelogs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY changelogs_admin_update ON public.changelogs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY changelogs_admin_delete ON public.changelogs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER changelogs_updated_at BEFORE UPDATE ON public.changelogs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX changelogs_date_idx ON public.changelogs (date DESC, created_at DESC);