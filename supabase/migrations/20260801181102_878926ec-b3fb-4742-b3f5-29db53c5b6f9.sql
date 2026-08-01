REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

CREATE POLICY "recipe_photos_own_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "recipe_photos_own_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "recipe_photos_own_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "recipe_photos_own_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);