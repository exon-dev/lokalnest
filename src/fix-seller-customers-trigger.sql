-- Fix for the ambiguous column reference in the update_seller_customers_after_order function
CREATE OR REPLACE FUNCTION update_seller_customers_after_order()
RETURNS TRIGGER AS $$
DECLARE
  customer_exists BOOLEAN;
  v_total_orders INTEGER;  -- Renamed to avoid ambiguity
  v_total_spent NUMERIC;   -- Renamed to avoid ambiguity
  v_customer_id UUID;      -- Renamed to avoid ambiguity
  v_seller_id UUID;        -- Renamed to avoid ambiguity
BEGIN
  -- Get customer_id and seller_id from the new order
  v_customer_id := NEW.buyer_id;
  v_seller_id := NEW.seller_id;
  
  -- Check if the customer already exists for this seller
  SELECT EXISTS (
    SELECT 1 FROM seller_customers
    WHERE customer_id = NEW.buyer_id AND seller_id = NEW.seller_id
  ) INTO customer_exists;
  
  -- Calculate total orders and spending for this customer with this seller
  SELECT 
    COUNT(*), 
    COALESCE(SUM(total_amount), 0)
  INTO 
    v_total_orders, 
    v_total_spent
  FROM orders
  WHERE 
    buyer_id = v_customer_id 
    AND seller_id = v_seller_id;
  
  -- If customer exists, update their record
  IF customer_exists THEN
    UPDATE seller_customers
    SET 
      total_orders = v_total_orders,  -- Fixed ambiguity
      total_spent = v_total_spent,    -- Fixed ambiguity
      last_purchase_date = NEW.created_at,
      status = 'active',
      updated_at = NOW()
    WHERE 
      customer_id = v_customer_id
      AND seller_id = v_seller_id;
  -- If customer doesn't exist, create a new record
  ELSE
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
    ) VALUES (
      v_customer_id,
      v_seller_id,
      v_total_orders,  -- Fixed ambiguity
      v_total_spent,   -- Fixed ambiguity
      NEW.created_at,
      'active',
      '{}',
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger on orders table
DO $$
BEGIN
  -- Drop the trigger if it already exists
  DROP TRIGGER IF EXISTS update_seller_customers_on_order ON orders;
  
  -- Create the trigger
  CREATE TRIGGER update_seller_customers_on_order
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_customers_after_order();
  
  RAISE NOTICE 'Successfully updated trigger for updating seller_customers';
END
$$;