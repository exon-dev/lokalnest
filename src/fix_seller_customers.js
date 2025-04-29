// Direct script to fix NULL seller_id values in seller_customers table
import { supabase } from './integrations/supabase/client';

async function fixSellerCustomers() {
  console.log('Starting seller_customers table fix...');
  
  try {
    // Step 1: Get all seller_customers records with NULL seller_id
    const { data: nullSellerCustomers, error: fetchError } = await supabase
      .from('seller_customers')
      .select('id, customer_id')
      .is('seller_id', null);
    
    if (fetchError) {
      throw new Error(`Error fetching NULL seller_customers: ${fetchError.message}`);
    }
    
    console.log(`Found ${nullSellerCustomers.length} records with NULL seller_id`);
    
    // Step 2: For each record, find orders placed by that customer
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const customer of nullSellerCustomers) {
      // Find orders for this customer
      const { data: customerOrders, error: ordersError } = await supabase
        .from('orders')
        .select('seller_id, total_amount')
        .eq('buyer_id', customer.customer_id)
        .order('created_at', { ascending: false });
      
      if (ordersError) {
        console.error(`Error fetching orders for customer ${customer.customer_id}: ${ordersError.message}`);
        failedCount++;
        continue;
      }
      
      if (!customerOrders || customerOrders.length === 0) {
        console.log(`No orders found for customer ${customer.customer_id}`);
        failedCount++;
        continue;
      }
      
      // Get the seller from the most recent order
      const sellerId = customerOrders[0].seller_id;
      
      if (!sellerId) {
        console.log(`No valid seller_id found in orders for customer ${customer.customer_id}`);
        failedCount++;
        continue;
      }
      
      // Calculate total orders and spending
      let totalOrders = customerOrders.length;
      let totalSpent = customerOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      // Update the seller_customers record
      const { error: updateError } = await supabase
        .from('seller_customers')
        .update({
          seller_id: sellerId,
          total_orders: totalOrders,
          total_spent: totalSpent,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);
      
      if (updateError) {
        console.error(`Error updating seller_customer record ${customer.id}: ${updateError.message}`);
        failedCount++;
        continue;
      }
      
      fixedCount++;
      console.log(`Fixed seller_customer record ${customer.id} - set seller_id to ${sellerId}`);
    }
    
    console.log(`
      Fix complete:
      - Total records processed: ${nullSellerCustomers.length}
      - Successfully fixed: ${fixedCount}
      - Failed to fix: ${failedCount}
    `);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the function
fixSellerCustomers();