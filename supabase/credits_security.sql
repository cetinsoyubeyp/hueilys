-- ============================================================
-- Hueilys — Credits Security & RPC Functions
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── 1. RPC: spend_credits (SECURITY DEFINER) ──────────────────
-- Deducts credits securely from server-side without direct update access
CREATE OR REPLACE FUNCTION public.spend_credits(cost NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits NUMERIC;
  new_credits NUMERIC;
BEGIN
  -- Get current user profile credits
  SELECT credits INTO current_credits 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF current_credits IS NULL OR current_credits < cost THEN
    RETURN FALSE;
  END IF;
  
  new_credits := ROUND((current_credits - cost), 2);
  
  -- Perform update (SECURITY DEFINER bypasses direct UPDATE policies)
  UPDATE public.profiles 
  SET credits = new_credits
  WHERE id = auth.uid();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. RPC: add_credits (SECURITY DEFINER) ─────────────────────
-- Adds credits securely to the user profile
CREATE OR REPLACE FUNCTION public.add_credits(amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  current_credits NUMERIC;
  new_credits NUMERIC;
BEGIN
  SELECT credits INTO current_credits 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  IF current_credits IS NULL THEN
    current_credits := 0;
  END IF;
  
  new_credits := ROUND((current_credits + amount), 2);
  
  UPDATE public.profiles 
  SET credits = new_credits
  WHERE id = auth.uid();
  
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Trigger: Protect profiles.credits from direct updates ─────
CREATE OR REPLACE FUNCTION public.protect_credits_column()
RETURNS TRIGGER AS $$
BEGIN
  -- If credits is modified, block the update unless the execution context
  -- is running under postgres (superuser), which is used by our RPC functions.
  -- This blocks direct client-side UPDATE profiles SET credits = X.
  IF NEW.credits IS DISTINCT FROM OLD.credits AND CURRENT_USER <> 'postgres' THEN
    RAISE EXCEPTION 'Kredi miktarı doğrudan güncellenemez. Güvenli RPC (spend_credits / add_credits) kullanın.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_protect_credits ON public.profiles;

CREATE TRIGGER tr_protect_credits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_credits_column();
