-- ============================================================================
-- ENZA MOBILE — SAMPLE SEED DATA FOR TESTING
-- Run this optionally after 001_initial_schema.sql to test Supabase data fetching
-- ============================================================================

DO $$
DECLARE
    v_product_id UUID;
    v_customer_id UUID;
    v_order_id UUID;
BEGIN
    -- 1. Insert Test Product Variant
    INSERT INTO public.product_variants (
        id,
        name,
        brand,
        category,
        color_name,
        color_hex,
        sku,
        barcode,
        unit,
        weight,
        diameter,
        sale_price,
        currency,
        available_qty,
        minimum_qty,
        target_stock,
        location,
        type
    ) VALUES (
        gen_random_uuid(),
        'PLA+ Filament',
        'eSUN',
        'esun',
        'أبيض عاجي',
        '#dddcd4',
        'ES-PLA-WH-1KG',
        '6922572200011',
        'بكرة',
        '١ كجم',
        '١.٧٥ مم',
        850.00,
        'EGP',
        24,
        5,
        50,
        'A-01',
        'spool'
    )
    ON CONFLICT (sku) DO UPDATE
    SET available_qty = 24
    RETURNING id INTO v_product_id;

    -- 2. Insert Test Customer
    INSERT INTO public.customers (
        id,
        display_name,
        initials,
        phone_e164,
        city,
        area,
        address,
        color
    ) VALUES (
        gen_random_uuid(),
        'عمر مصطفى',
        'عم',
        '+201001234567',
        'القاهرة',
        'مدينة نصر',
        'مدينة نصر، القاهرة — عنوان تجريبي',
        'red'
    )
    RETURNING id INTO v_customer_id;

    -- 3. Insert Test Order
    INSERT INTO public.orders (
        id,
        display_number,
        customer_id,
        placed_at,
        source_status,
        fulfillment_status,
        payment_method,
        payment_status,
        shipping_amount,
        total_amount,
        currency
    ) VALUES (
        gen_random_uuid(),
        'EN-1048',
        v_customer_id,
        NOW(),
        'sale',
        'new',
        'الدفع عند الاستلام',
        'pending',
        80.00,
        1780.00,
        'EGP'
    )
    ON CONFLICT (display_number) DO UPDATE
    SET total_amount = 1780.00
    RETURNING id INTO v_order_id;

    -- 4. Insert Order Line
    INSERT INTO public.order_lines (
        order_id,
        variant_id,
        label_snapshot,
        qty,
        unit_price,
        line_total
    ) VALUES (
        v_order_id,
        v_product_id,
        'eSUN PLA+ Filament - أبيض عاجي',
        2,
        850.00,
        1700.00
    );

    -- 5. Insert Initial Stock Movement
    INSERT INTO public.stock_movements (
        variant_id,
        direction,
        qty,
        reason,
        balance_before,
        balance_after
    ) VALUES (
        v_product_id,
        'in',
        24,
        'توريد أولي للمخزن',
        0,
        24
    );

    RAISE NOTICE 'Test seed data created successfully!';
END $$;
