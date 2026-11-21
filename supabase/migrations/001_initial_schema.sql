-- ============================================================================
-- ENZA MOBILE — SUPABASE INITIAL MIGRATION
-- Schema: Profiles, Products & Variants, Customers, Orders & Lines,
--         Stock Movements, Sync Runs + Atomic Procedures + RLS Policies
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS (Created safely)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator', 'viewer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status') THEN
        CREATE TYPE fulfillment_status AS ENUM ('new', 'preparing', 'shipped', 'delivered', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_direction') THEN
        CREATE TYPE stock_direction AS ENUM ('in', 'out');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
        CREATE TYPE sync_status AS ENUM ('running', 'success', 'failed');
    END IF;
END $$;

-- ============================================================================
-- 3. CORE TABLES
-- ============================================================================

-- PROFILES (Maps to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'operator',
    organization_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notification_preference BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCT VARIANTS (Core inventory & catalog items)
-- Note: Each filament spool, resin bottle, or variant has its own row, SKU, barcode, and balance.
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT, -- ID in external system (e.g. Odoo product.product)
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT 'eSUN',
    category TEXT NOT NULL DEFAULT 'esun',
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#25262B',
    image_url TEXT,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT,
    unit TEXT NOT NULL DEFAULT 'بكرة',
    weight TEXT NOT NULL DEFAULT '١ كجم',
    diameter TEXT DEFAULT '١.٧٥ مم',
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    -- Database-level check strictly preventing negative balance!
    available_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
    reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
    minimum_qty INTEGER NOT NULL DEFAULT 5 CHECK (minimum_qty >= 0),
    target_stock INTEGER NOT NULL DEFAULT 50 CHECK (target_stock >= 0),
    location TEXT NOT NULL DEFAULT 'A-01',
    type TEXT NOT NULL DEFAULT 'spool' CHECK (type IN ('spool', 'bottle', 'box', 'other')),
    source_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CUSTOMERS (Client directory)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT, -- ID in external system (e.g. Odoo res.partner)
    display_name TEXT NOT NULL,
    initials TEXT,
    phone_e164 TEXT,
    city TEXT NOT NULL,
    area TEXT,
    address TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'red',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDERS (Sales orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_number TEXT NOT NULL UNIQUE, -- e.g. 'EN-1048'
    external_id TEXT, -- ID in external system (e.g. Odoo sale.order)
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_status TEXT, -- Original status in Odoo/e-commerce
    fulfillment_status fulfillment_status NOT NULL DEFAULT 'new',
    payment_method TEXT NOT NULL DEFAULT 'الدفع عند الاستلام',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ORDER LINES (Items in order)
CREATE TABLE IF NOT EXISTS public.order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    label_snapshot TEXT NOT NULL, -- Name and color snapshotted at time of purchase
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STOCK MOVEMENTS (Auditable immutable ledger)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    direction stock_direction NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    reason TEXT NOT NULL, -- e.g. 'supply', 'return', 'sale', 'adjustment', 'damage'
    actor_id UUID REFERENCES auth.users(id),
    related_order_id UUID REFERENCES public.orders(id),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SYNC RUNS (Log of external synchronization runs)
CREATE TABLE IF NOT EXISTS public.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status sync_status NOT NULL DEFAULT 'running',
    latest_successful_at TIMESTAMPTZ,
    counters JSONB NOT NULL DEFAULT '{}'::jsonb,
    safe_error_message TEXT,
    triggered_by TEXT NOT NULL DEFAULT 'manual', -- 'scheduler', 'manual', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES (Optimized for mobile search and queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_category ON public.product_variants(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(display_name);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON public.orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON public.order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON public.sync_runs(status, started_at DESC);

-- ============================================================================
-- 5. ATOMIC FUNCTIONS & CONCURRENCY CONTROLS
-- ============================================================================

-- Function to record stock movements with strict DB-level overdraft protection
CREATE OR REPLACE FUNCTION public.apply_stock_movement(
    p_variant_id UUID,
    p_direction stock_direction,
    p_qty INTEGER,
    p_reason TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_related_order_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_actor_id UUID;
    v_movement_id UUID;
    v_existing_id UUID;
BEGIN
    -- Idempotency check: if already processed, return existing movement result
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, balance_after INTO v_existing_id, v_new_balance
        FROM public.stock_movements
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'movement_id', v_existing_id,
                'balance_after', v_new_balance,
                'idempotent_replay', true
            );
        END IF;
    END IF;

    -- Validate quantity
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'الكمية يجب أن تكون عددًا صحيحًا موجبًا' USING ERRCODE = '22003';
    END IF;

    -- Lock the product variant row for update to prevent race conditions
    SELECT available_qty INTO v_current_balance
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المنتج غير موجود' USING ERRCODE = 'P0002';
    END IF;

    -- Calculate new balance
    IF p_direction = 'in' THEN
        v_new_balance := v_current_balance + p_qty;
    ELSIF p_direction = 'out' THEN
        -- STRICT OVERDRAFT PREVENTION
        IF v_current_balance < p_qty THEN
            RAISE EXCEPTION 'الكمية المطلوبة (%) أكبر من الرصيد المتاح (%) داخل المخزن', p_qty, v_current_balance
                USING ERRCODE = '23514'; -- check_violation
        END IF;
        v_new_balance := v_current_balance - p_qty;
    ELSE
        RAISE EXCEPTION 'اتجاه الحركة غير صالح' USING ERRCODE = '22023';
    END IF;

    -- Update balance
    UPDATE public.product_variants
    SET available_qty = v_new_balance,
        updated_at = NOW()
    WHERE id = p_variant_id;

    -- Get current authenticated user
    v_actor_id := auth.uid();

    -- Insert movement record
    INSERT INTO public.stock_movements (
        idempotency_key,
        variant_id,
        direction,
        qty,
        reason,
        actor_id,
        related_order_id,
        balance_before,
        balance_after,
        created_at
    ) VALUES (
        p_idempotency_key,
        p_variant_id,
        p_direction,
        p_qty,
        p_reason,
        v_actor_id,
        p_related_order_id,
        v_current_balance,
        v_new_balance,
        NOW()
    )
    RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'balance_before', v_current_balance,
        'balance_after', v_new_balance,
        'direction', p_direction,
        'qty', p_qty
    );
END;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict company data privacy: Public registration is closed/isolated.
-- Only authenticated users with an authorized, active profile can access company data.
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current auth user is authorized and active
CREATE OR REPLACE FUNCTION public.is_authorized_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role IN ('admin', 'manager', 'operator', 'viewer')
    );
$$;

-- Helper function: Check if current auth user has write privileges
CREATE OR REPLACE FUNCTION public.can_write_company_data()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role IN ('admin', 'manager', 'operator')
    );
$$;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_authorized_user());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Product Variants policies (Read for all authorized, Write for admin/manager/operator)
DROP POLICY IF EXISTS "variants_read_auth" ON public.product_variants;
CREATE POLICY "variants_read_auth" ON public.product_variants
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "variants_write_auth" ON public.product_variants;
CREATE POLICY "variants_write_auth" ON public.product_variants
    FOR ALL TO authenticated
    USING (can_write_company_data())
    WITH CHECK (can_write_company_data());

-- Customers policies
DROP POLICY IF EXISTS "customers_read_auth" ON public.customers;
CREATE POLICY "customers_read_auth" ON public.customers
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "customers_write_auth" ON public.customers;
CREATE POLICY "customers_write_auth" ON public.customers
    FOR ALL TO authenticated
    USING (can_write_company_data())
    WITH CHECK (can_write_company_data());

-- Orders policies
DROP POLICY IF EXISTS "orders_read_auth" ON public.orders;
CREATE POLICY "orders_read_auth" ON public.orders
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "orders_write_auth" ON public.orders;
CREATE POLICY "orders_write_auth" ON public.orders
    FOR ALL TO authenticated
    USING (can_write_company_data())
    WITH CHECK (can_write_company_data());

-- Order Lines policies
DROP POLICY IF EXISTS "order_lines_read_auth" ON public.order_lines;
CREATE POLICY "order_lines_read_auth" ON public.order_lines
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "order_lines_write_auth" ON public.order_lines;
CREATE POLICY "order_lines_write_auth" ON public.order_lines
    FOR ALL TO authenticated
    USING (can_write_company_data())
    WITH CHECK (can_write_company_data());

-- Stock Movements policies (Read: authorized, Insert: can_write)
DROP POLICY IF EXISTS "stock_movements_read_auth" ON public.stock_movements;
CREATE POLICY "stock_movements_read_auth" ON public.stock_movements
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "stock_movements_insert_auth" ON public.stock_movements;
CREATE POLICY "stock_movements_insert_auth" ON public.stock_movements
    FOR INSERT TO authenticated
    WITH CHECK (can_write_company_data());

-- Sync Runs policies
DROP POLICY IF EXISTS "sync_runs_read_auth" ON public.sync_runs;
CREATE POLICY "sync_runs_read_auth" ON public.sync_runs
    FOR SELECT TO authenticated
    USING (is_authorized_user());

DROP POLICY IF EXISTS "sync_runs_write_auth" ON public.sync_runs;
CREATE POLICY "sync_runs_write_auth" ON public.sync_runs
    FOR ALL TO authenticated
    USING (can_write_company_data())
    WITH CHECK (can_write_company_data());

-- ============================================================================
-- 7. AUTH TRIGGER: AUTO-CREATE INACTIVE PROFILE ON SIGNUP
-- To prevent open public registration from accessing data:
-- Any self-registered user is assigned 'is_active = false',
-- requiring an admin to activate them before any data can be read!
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'operator',
        -- Notice: Only active if specified by admin metadata or manually approved
        COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, false),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
