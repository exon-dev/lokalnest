-- Script to fix customer data for a new seller
-- Replace 'SELLER_ID_HERE' with the actual seller ID
DO $$
DECLARE
  v_seller_id UUID := 'SELLER_ID_HERE'::UUID; -- Replace with actual seller ID
  v_verification_status TEXT;
  v_order_count INTEGER;
BEGIN
  -- 1. Check seller verification status
  SELECT status INTO v_verification_status
  FROM seller_verifications
  WHERE seller_id = v_seller_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RAISE NOTICE 'Seller verification status: %', COALESCE(v_verification_status, 'not found');
  
  -- 2. Ensure seller is verified (only if needed)
  IF v_verification_status IS NULL OR v_verification_status NOT IN ('approved', 'verified') THEN
    -- Insert or update verification record to approved
    INSERT INTO seller_verifications (
      seller_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_seller_id,
      'approved',
      NOW(),
      NOW()
    )
    ON CONFLICT (seller_id) DO UPDATE
    SET status = 'approved', updated_at = NOW();
    
    RAISE NOTICE 'Updated seller verification status to approved';
  END IF;
  
  -- 3. Check if seller has any orders
  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE seller_id = v_seller_id;
  
  RAISE NOTICE 'Seller has % orders', v_order_count;
  
  -- 4. Sync seller_customers table with existing orders
  -- This will create or update seller_customer records for all customers
  -- who have placed orders with this seller
  WITH order_summary AS (
    SELECT 
      buyer_id as customer_id,
      COUNT(*) as total_orders,
      SUM(total_amount) as total_spent,
      MAX(created_at) as last_purchase_date
    FROM orders
    WHERE seller_id = v_seller_id
    GROUP BY buyer_id
  )
  INSERT INTO seller_customers (
    customer_id,
    seller_id,
    total_orders,
    total_spent,
    last_purchase_date,
    status,
    tags,
    created_at,
    updated_at
  )
  SELECT
    os.customer_id,
    v_seller_id,
    os.total_orders,
    os.total_spent,
    os.last_purchase_date,
    'active',
    '{}',
    NOW(),
    NOW()
  FROM order_summary os
  ON CONFLICT (customer_id, seller_id) DO UPDATE
  SET
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    last_purchase_date = EXCLUDED.last_purchase_date,
    status = 'active',
    updated_at = NOW();
    
  RAISE NOTICE 'Synced customer data for seller';
END $$; 