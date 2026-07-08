-- ============================================================
-- Hueilys — Stores Table
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Stores tablosu ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace TEXT        NOT NULL CHECK (marketplace IN (
                            'trendyol', 'amazon', 'hepsiburada', 'n11', 'ebay', 'shopify'
                          )),
  store_name  TEXT        NOT NULL,
  seller_id   TEXT,
  api_key     TEXT,
  api_secret  TEXT,
  is_active   BOOLEAN     DEFAULT TRUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── updated_at trigger ──────────────────────────────────────
DROP TRIGGER IF EXISTS on_stores_updated ON public.stores;
CREATE TRIGGER on_stores_updated
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stores"   ON public.stores;
DROP POLICY IF EXISTS "Users can create own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;

CREATE POLICY "Users can view own stores"
  ON public.stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stores"
  ON public.stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON public.stores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON public.stores FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Doğrulama ───────────────────────────────────────────────
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'stores' ORDER BY ordinal_position;
