DROP POLICY IF EXISTS recipes_own_all ON public.recipes;
CREATE POLICY recipes_own_select ON public.recipes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY recipes_own_insert ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY recipes_own_update ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY recipes_own_delete ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = user_id);