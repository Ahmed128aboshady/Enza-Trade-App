-- ============================================================================
-- ENZA MOBILE — MIGRATION 003: OPERATIONAL FEATURES
-- Partial Payments, Waybill & Cash Collection Proofs, Custodian Stock
-- ============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waybill_image_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS custodian_qty INTEGER DEFAULT 0;

-- Custodian movements table
CREATE TABLE IF NOT EXISTS public.custodian_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id),
    type TEXT NOT NULL CHECK (type IN ('receive_from_main', 'disburse_to_customer', 'return_to_main')),
    qty INTEGER NOT NULL CHECK (qty > 0),
    cash_collected NUMERIC(12, 2) DEFAULT 0,
    cash_remaining NUMERIC(12, 2) DEFAULT 0,
    related_order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Policies for anon & authenticated
ALTER TABLE public.custodian_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_custodian" ON public.custodian_movements;
CREATE POLICY "anon_custodian" ON public.custodian_movements FOR ALL TO anon USING (true);
DROP POLICY IF EXISTS "auth_custodian" ON public.custodian_movements;
CREATE POLICY "auth_custodian" ON public.custodian_movements FOR ALL TO authenticated USING (true);
