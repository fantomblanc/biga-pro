ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS enable_monetization boolean NOT NULL DEFAULT false;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS default_plan_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free';

CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_plan_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.plan_type := OLD.plan_type;
  END IF;
  IF NEW.plan_type NOT IN ('free','pro') THEN NEW.plan_type := 'free'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_protect_plan BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_plan_type();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _plan text;
BEGIN
  SELECT COALESCE(default_plan_type,'free') INTO _plan FROM public.app_settings WHERE id = 1;
  INSERT INTO public.profiles (id, email, display_name, plan_type)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)), COALESCE(_plan,'free'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;