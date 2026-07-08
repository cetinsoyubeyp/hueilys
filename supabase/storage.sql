-- ============================================================
-- Hueilys — Storage Setup (opsiyonel — avatar yükleme için)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Avatar bucket oluştur (public = herkes okuyabilir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Herkes avatar okuyabilir
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Sadece kendi klasörüne yükleyebilir (/<user-id>/avatar.jpg)
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Sadece kendi avatarını güncelleyebilir
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Sadece kendi avatarını silebilir
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
