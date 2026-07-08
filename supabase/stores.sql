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
  api_key_secret_id UUID,
  api_secret_secret_id UUID,
  is_active   BOOLEAN     DEFAULT TRUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── manage_store_secrets trigger function ───────────────────
-- Intercepts api_key and api_secret, writes them to vault.secrets,
-- sets references and zeroes out plain text to prevent leakages.
CREATE OR REPLACE FUNCTION public.manage_store_secrets()
RETURNS TRIGGER AS $$
DECLARE
  v_key_id UUID;
  v_secret_id UUID;
BEGIN
  -- Generate NEW.id on INSERT if not provided
  IF TG_OP = 'INSERT' AND NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  -- On INSERT
  IF (TG_OP = 'INSERT') THEN
    -- Insert api_key into vault if provided
    IF NEW.api_key IS NOT NULL THEN
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || NEW.id || '_api_key',
        NEW.api_key,
        'API key for store ' || NEW.store_name
      ) RETURNING id INTO v_key_id;
      NEW.api_key_secret_id := v_key_id;
    END IF;

    -- Insert api_secret into vault if provided
    IF NEW.api_secret IS NOT NULL THEN
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || NEW.id || '_api_secret',
        NEW.api_secret,
        'API secret for store ' || NEW.store_name
      ) RETURNING id INTO v_secret_id;
      NEW.api_secret_secret_id := v_secret_id;
    END IF;

    -- Clear plain text columns
    NEW.api_key := NULL;
    NEW.api_secret := NULL;

  -- On UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Manage api_key updates (only if client sends a non-null new key)
    IF NEW.api_key IS NOT NULL THEN
      IF OLD.api_key_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = OLD.api_key_secret_id;
      END IF;
      
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || NEW.id || '_api_key',
        NEW.api_key,
        'API key for store ' || NEW.store_name
      ) RETURNING id INTO v_key_id;
      NEW.api_key_secret_id := v_key_id;
    END IF;

    -- Manage api_secret updates (only if client sends a non-null new secret)
    IF NEW.api_secret IS NOT NULL THEN
      IF OLD.api_secret_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = OLD.api_secret_secret_id;
      END IF;

      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || NEW.id || '_api_secret',
        NEW.api_secret,
        'API secret for store ' || NEW.store_name
      ) RETURNING id INTO v_secret_id;
      NEW.api_secret_secret_id := v_secret_id;
    END IF;

    -- Clear plain text columns
    NEW.api_key := NULL;
    NEW.api_secret := NULL;

  -- On DELETE
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.api_key_secret_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = OLD.api_key_secret_id;
    END IF;
    IF OLD.api_secret_secret_id IS NOT NULL THEN
      DELETE FROM vault.secrets WHERE id = OLD.api_secret_secret_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS tr_manage_store_secrets ON public.stores;
CREATE TRIGGER tr_manage_store_secrets
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_store_secrets();

-- Bind the delete trigger (AFTER trigger to ensure delete completes)
DROP TRIGGER IF EXISTS tr_delete_store_secrets ON public.stores;
CREATE TRIGGER tr_delete_store_secrets
  AFTER DELETE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.manage_store_secrets();

-- ─── RPC: get_store_credentials ──────────────────────────────
-- Decrypts store API keys securely for user owned stores. Runs as SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_store_credentials(p_store_id UUID)
RETURNS TABLE (api_key TEXT, api_secret TEXT) AS $$
BEGIN
  -- Verify the store belongs to the current authenticated user
  IF EXISTS (
    SELECT 1 FROM public.stores 
    WHERE id = p_store_id AND user_id = auth.uid()
  ) THEN
    RETURN QUERY 
    SELECT 
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = s.api_key_secret_id),
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = s.api_secret_secret_id)
    FROM public.stores s
    WHERE s.id = p_store_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: upsert_store ────────────────────────────────────────
-- Handles insertion and updates of stores, executing as SECURITY DEFINER
-- to bypass pgsodium / Vault execution permission limits for standard user roles.
CREATE OR REPLACE FUNCTION public.upsert_store(
  p_store_id UUID,
  p_store_name TEXT,
  p_seller_id TEXT,
  p_api_key TEXT,
  p_api_secret TEXT,
  p_marketplace TEXT
)
RETURNS public.stores AS $$
DECLARE
  v_store public.stores;
  v_key_id UUID;
  v_secret_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz erişim. Lütfen giriş yapın.';
  END IF;

  -- 1. If p_store_id is provided, verify ownership and update
  IF p_store_id IS NOT NULL THEN
    -- Verify ownership
    SELECT * INTO v_store FROM public.stores 
    WHERE id = p_store_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Mağaza bulunamadı veya bu işlem için yetkiniz yok.';
    END IF;

    -- Handle API Key Update in Vault
    IF p_api_key IS NOT NULL THEN
      IF v_store.api_key_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_store.api_key_secret_id;
      END IF;
      
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || p_store_id || '_api_key',
        p_api_key,
        'API key for store ' || p_store_name
      ) RETURNING id INTO v_key_id;
    ELSE
      v_key_id := v_store.api_key_secret_id;
    END IF;

    -- Handle API Secret Update in Vault
    IF p_api_secret IS NOT NULL THEN
      IF v_store.api_secret_secret_id IS NOT NULL THEN
        DELETE FROM vault.secrets WHERE id = v_store.api_secret_secret_id;
      END IF;

      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || p_store_id || '_api_secret',
        p_api_secret,
        'API secret for store ' || p_store_name
      ) RETURNING id INTO v_secret_id;
    ELSE
      v_secret_id := v_store.api_secret_secret_id;
    END IF;

    -- Update stores table record (setting plain-text fields to NULL)
    UPDATE public.stores
    SET
      store_name = p_store_name,
      seller_id = p_seller_id,
      api_key_secret_id = v_key_id,
      api_secret_secret_id = v_secret_id,
      api_key = NULL,
      api_secret = NULL,
      updated_at = NOW()
    WHERE id = p_store_id
    RETURNING * INTO v_store;

  -- 2. If p_store_id is NULL, insert a new store
  ELSE
    -- Generate a new store ID
    p_store_id := gen_random_uuid();

    -- Insert API key in Vault if provided
    IF p_api_key IS NOT NULL THEN
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || p_store_id || '_api_key',
        p_api_key,
        'API key for store ' || p_store_name
      ) RETURNING id INTO v_key_id;
    ELSE
      v_key_id := NULL;
    END IF;

    -- Insert API secret in Vault if provided
    IF p_api_secret IS NOT NULL THEN
      INSERT INTO vault.secrets (name, secret, description)
      VALUES (
        'store_' || p_store_id || '_api_secret',
        p_api_secret,
        'API secret for store ' || p_store_name
      ) RETURNING id INTO v_secret_id;
    ELSE
      v_secret_id := NULL;
    END IF;

    -- Insert new store into table (setting plain-text fields to NULL)
    INSERT INTO public.stores (
      id,
      user_id,
      marketplace,
      store_name,
      seller_id,
      api_key_secret_id,
      api_secret_secret_id,
      api_key,
      api_secret
    )
    VALUES (
      p_store_id,
      v_user_id,
      p_marketplace,
      p_store_name,
      p_seller_id,
      v_key_id,
      v_secret_id,
      NULL,
      NULL
    )
    RETURNING * INTO v_store;
  END IF;

  RETURN v_store;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ─── İndeksler ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);

-- ─── Doğrulama ───────────────────────────────────────────────
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'stores' ORDER BY ordinal_position;
