-- ============================================================
-- Hueilys — Price Logs Table (Fiyat Geçmişi)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.price_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  date        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  barcode     TEXT        NOT NULL,
  type        TEXT        NOT NULL, -- 'Bireysel' | 'Toplu'
  old_price   NUMERIC     NOT NULL,
  new_price   NUMERIC     NOT NULL,
  status      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── RLS (Row Level Security) Etkinleştirme ────────────────
ALTER TABLE public.price_logs ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların sadece kendi işlemlerini görebilmesi/ekleyebilmesi için kurallar:
DROP POLICY IF EXISTS "Users can manage own price logs" ON public.price_logs;

CREATE POLICY "Users can manage own price logs"
  ON public.price_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── İndeksler ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_price_logs_composite ON public.price_logs(store_id, user_id, created_at DESC);
