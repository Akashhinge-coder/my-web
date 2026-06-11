-- ── 1. Create Idempotency Keys Table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT NOT NULL,
  restaurant_id     UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  request_hash      TEXT NOT NULL,
  response_payload  JSONB,
  status            TEXT NOT NULL DEFAULT 'started',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  UNIQUE(restaurant_id, session_id, key)
);

-- Enable RLS and add basic select policy (if RLS is active)
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role to manage idempotency keys"
  ON public.idempotency_keys FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 2. Add Unique Constraint on payments.session_id ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_session_id_key'
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_session_id_key UNIQUE (session_id);
  END IF;
END;
$$;

-- ── 3. Add Unique Constraint on invoices.payment_id ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_payment_id_key'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_id_key UNIQUE (payment_id);
  END IF;
END;
$$;

-- ── 4. Create Atomic Session Total Increment Function ─────────
CREATE OR REPLACE FUNCTION public.increment_session_total(p_session_id UUID, p_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total NUMERIC;
BEGIN
  UPDATE public.sessions
  SET total_amount = total_amount + p_amount
  WHERE id = p_session_id
  RETURNING total_amount INTO v_new_total;
  
  RETURN v_new_total;
END;
$$;
