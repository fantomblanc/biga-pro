ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_recipes_per_user integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_signups boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_hydration numeric NOT NULL DEFAULT 65,
  ADD COLUMN IF NOT EXISTS default_ball_weight numeric NOT NULL DEFAULT 270,
  ADD COLUMN IF NOT EXISTS default_biga_pct numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS default_dough_temp numeric NOT NULL DEFAULT 23,
  ADD COLUMN IF NOT EXISTS banner_type text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS banner_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS app_version text NOT NULL DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS changelog text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ga_measurement_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ga_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Admin read access for stats and user management
CREATE POLICY "recipes_admin_read" ON public.recipes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_read" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "feedback_admin_update" ON public.feedback_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));