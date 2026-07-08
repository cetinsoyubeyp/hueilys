-- ============================================================
-- Hueilys — Product Groups Table (Ürün Grupları)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID        NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  barcodes    TEXT[]      NOT NULL, -- Gruptaki ürünlerin barkod dizisi
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── RLS (Row Level Security) Etkinleştirme ────────────────
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların sadece kendi oluşturdukları grupları yönetebilmesi için kural:
DROP POLICY IF EXISTS "Users can manage own product groups" ON public.product_groups;

CREATE POLICY "Users can manage own product groups"
  ON public.product_groups
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
