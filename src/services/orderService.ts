import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/components/buyer/shopping/Cart';
import { Order as BuyerOrder } from '@/components/buyer/orders/types';
import { toast } from 'sonner';

// Helper function to validate UUID format
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Order status types
export type OrderStatus = 'pending' | 'payment_approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Order interface
export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_ids: string[];
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  payment_method: string;
  shipping_address: string;
  billing_address: string;
  payment_status?: string;
  estimated_delivery?: string;
  tracking_number?: string;
  delivery_option?: string;
}

// Get orders for the current user (as a buyer)
export async function getBuyerOrders(): Promise<Omit<Order, 'product_ids'>[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the database records to match the expected Order type
    return (data || []).map(order => ({
      id: order.id,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      // Set empty array as this field is omitted in the return type
      product_ids: [],
      status: order.status as OrderStatus,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      payment_method: order.payment_method,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      tracking_number: order.tracking_number
    }));
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    return [];
  }
}

// Get orders for the current user (as a seller)
export async function getSellerOrders(): Promise<Order[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the database records to match the expected Order type
    return (data || []).map(order => ({
      id: order.id,
      buyer_id: order.buyer_id,
      seller_id: order.seller_id,
      product_ids: [], // Set empty array or fetch from order_items if needed
      status: order.status as OrderStatus,
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      payment_method: order.payment_method,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      tracking_number: order.tracking_number
    }));
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return [];
  }
}

// Create a new order
export async function createOrder(orderData: Partial<Order>, cartItems?: CartItem[]): Promise<string | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Set the buyer ID to the current user
    orderData.buyer_id = user.id;
    
    // Default values
    orderData.status = 'pending';
    orderData.created_at = new Date().toISOString();
    orderData.updated_at = new Date().toISOString();
    
    // Set billing_address to shipping_address if not provided
    if (!orderData.billing_address && orderData.shipping_address) {
      orderData.billing_address = orderData.shipping_address;
    }
    
    // Check if required fields are present
    if (!orderData.payment_method) {
      throw new Error('Payment method is required');
    }
    if (!orderData.shipping_address) {
      throw new Error('Shipping address is required');
    }
    if (!orderData.billing_address) {
      throw new Error('Billing address is required');
    }

    // Use the single() method to ensure column references are not ambiguous
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData as any)
      .select('id')
      .single();

    if (error) throw error;

    // Create order items if cart items are provided
    if (cartItems && cartItems.length > 0) {
      const orderItems = cartItems.map(item => ({
        order_id: data.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
        
      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Consider whether to roll back the order if items fail
      }
    }

    // Create notification for the seller
    if (orderData.seller_id) {
      await createNewOrderNotification(orderData.seller_id, data.id);
    }

    return data.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error; // Throw the error so we can handle it in the checkout process
  }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // First get the order to check if we're the seller
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    
    // Check if the current user is the seller for this order
    if (order.seller_id !== user.id) {
      throw new Error('You are not authorized to update this order');
    }

    // Update the order status
    const { error } = await supabase
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);

    if (error) throw error;

    // Create notification for the buyer based on the status
    if (status === 'payment_approved') {
      await createPaymentApprovedNotification(order.buyer_id, orderId);
    } else if (status === 'shipped') {
      await createOrderShippedNotification(order.buyer_id, orderId);
    } else if (status === 'delivered') {
      await createOrderDeliveredNotification(order.buyer_id, orderId);
    }

    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error(`Failed to update order status: ${error.message}`);
    return false;
  }
}

// Helper function to create a notification for new order
async function createNewOrderNotification(sellerId: string, orderId: string): Promise<boolean> {
  try {
    console.log('Creating notification for seller:', sellerId, 'for order:', orderId);
    
    // Use the enhanced database function that checks preferences automatically
    const { data, error } = await (supabase.rpc as any)('create_order_notification', {
      p_user_id: sellerId,
      p_order_id: orderId,
      p_title: 'New Order Received',
      p_message: `You have received a new order #${orderId}. Please review and process it.`,
      p_type: 'new_order'
    });

    if (error) {
      console.error('Error creating order notification:', error);
      return false;
    }
    
    if (data === null) {
      console.log('Notification not created - seller has disabled order notifications');
    } else {
      console.log('Order notification created successfully with ID:', data);
    }
    
    return true;
  } catch (error) {
    console.error('Exception in createNewOrderNotification:', error);
    return false;
  }
}

// Helper function to create a notification for payment approved
async function createPaymentApprovedNotification(buyerId: string, orderId: string): Promise<boolean> {
  try {
    // Use RPC function to create notification
    const { error } = await (supabase.rpc as any)('create_order_status_notification', {
      p_user_id: buyerId,
      p_order_id: orderId,
      p_status: 'payment_approved',
      p_title: 'Payment Approved',
      p_message: `Your payment for order #${orderId} has been approved. Your order will be processed soon.`
    });

    if (error) {
      console.error('Error creating payment approved notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating payment approved notification:', error);
    return false;
  }
}

// Helper function to create a notification for order shipped
async function createOrderShippedNotification(buyerId: string, orderId: string): Promise<boolean> {
  try {
    // Use RPC function to create notification
    const { error } = await (supabase.rpc as any)('create_order_status_notification', {
      p_user_id: buyerId,
      p_order_id: orderId,
      p_status: 'shipped',
      p_title: 'Order Shipped',
      p_message: `Your order #${orderId} has been shipped. You can track your delivery status in your orders page.`
    });

    if (error) {
      console.error('Error creating order shipped notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating order shipped notification:', error);
    return false;
  }
}

// Helper function to create a notification for order delivered
async function createOrderDeliveredNotification(buyerId: string, orderId: string): Promise<boolean> {
  try {
    // Use RPC function to create notification
    const { error } = await (supabase.rpc as any)('create_order_status_notification', {
      p_user_id: buyerId,
      p_order_id: orderId,
      p_status: 'delivered',
      p_title: 'Order Delivered',
      p_message: `Your order #${orderId} has been delivered. We hope you enjoy your purchase!`
    });

    if (error) {
      console.error('Error creating order delivered notification:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating order delivered notification:', error);
    return false;
  }
}

export async function updateOrderPaymentStatus(orderId: string, paymentIntentId: string, status: string) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_intent_id: paymentIntentId,
        payment_status: status
      })
      .eq('id', orderId);
      
    if (error) {
      throw new Error(`Failed to update order payment status: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Order payment status update failed:', error);
    throw error;
  }
}

export async function getOrders(): Promise<BuyerOrder[]> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be signed in to view orders');
    }
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, 
        created_at, 
        total_amount, 
        status,
        payment_status,
        payment_method,
        tracking_number,
        tracking_url,
        estimated_delivery,
        order_items (
          id,
          product_id,
          quantity,
          unit_price
        )
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    // Get user's address and profile data
    const { data: userAddresses, error: addressError } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // If no addresses found or there was an error, log it
    if (addressError) {
      console.error('Error fetching user address:', addressError);
    }
    
    // Debug log for address data
    console.log('User address data:', userAddresses);
    
    // Get user's profile data for the phone number
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();
    
    // Fetch product details separately to avoid the relationship conflict
    const orderWithItems = await Promise.all((orders || []).map(async (order: any) => {
      // Get product details for each order item
      const orderItems = await Promise.all(order.order_items.map(async (item: any) => {
        const { data: product } = await supabase
          .from('products')
          .select('name, id')
          .eq('id', item.product_id)
          .single();
          
        // Get the first image for this product
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', item.product_id)
          .limit(1);
          
        return {
          name: product?.name || 'Product Name Unavailable',
          quantity: item.quantity,
          price: item.unit_price,
          image: images && images.length > 0 ? images[0].url : '',
          product_id: item.product_id // Include the product_id in the returned item
        };
      }));
      
      return {
        id: order.id,
        date: order.created_at,
        items: orderItems,
        total: order.total_amount,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        // Include address and phone data from the user's default address and profile
        addresses: userAddresses ? {
          address_line1: userAddresses.address_line1,
          address_line2: userAddresses.address_line2 || '',
          city: userAddresses.city,
          state: userAddresses.state,
          postal_code: userAddresses.postal_code,
          country: userAddresses.country
        } : {
          // Provide an empty address object instead of null
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: ''
        },
        phone: userProfile?.phone || null,
        tracking: order.tracking_number ? {
          id: order.tracking_number,
          courier: 'Shipping Partner',
          url: order.tracking_url || '',
          estimatedDelivery: order.estimated_delivery || '',
          updates: []
        } : undefined
      };
    }));
    
    return orderWithItems;
  } catch (error) {
    console.error('Fetching orders failed:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to fetch your orders');
    throw error;
  }
}

/**
 * Get products from delivered orders that haven't been reviewed yet
 * @returns Array of products that can be reviewed
 */
export async function getReviewableProducts() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be signed in to view reviewable products');
    }
    
    const buyerId = user.id;
    
    // Step 1: Get all delivered orders for this user
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, 
        created_at, 
        order_items (
          product_id
        )
      `)
      .eq('buyer_id', buyerId)
      .eq('status', 'delivered');
    
    if (ordersError) {
      throw new Error(`Failed to fetch delivered orders: ${ordersError.message}`);
    }
    
    // Step 2: Get all products from these orders
    const productIds = new Set<string>();
    const orderProductMap = new Map<string, { orderId: string, orderDate: string }>();
    
    orders.forEach(order => {
      order.order_items.forEach((item: { product_id: string }) => {
        productIds.add(item.product_id);
        // Store order info for each product
        orderProductMap.set(item.product_id, { 
          orderId: order.id, 
          orderDate: order.created_at 
        });
      });
    });
    
    if (productIds.size === 0) {
      return []; // No delivered products to review
    }
    
    // Step 3: Check which of these products have already been reviewed
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('buyer_id', buyerId)
      .in('product_id', Array.from(productIds));
    
    if (reviewsError) {
      throw new Error(`Failed to check reviewed products: ${reviewsError.message}`);
    }
    
    // Step 4: Filter out products that have already been reviewed
    const reviewedProductIds = new Set(reviews.map(review => review.product_id));
    const unreviewedProductIds = Array.from(productIds).filter(id => !reviewedProductIds.has(id));
    
    if (unreviewedProductIds.length === 0) {
      return []; // All products have been reviewed
    }
    
    // Step 5: Get details for the products that can be reviewed
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id, 
        name
      `)
      .in('id', unreviewedProductIds);
    
    if (productsError) {
      throw new Error(`Failed to fetch product details: ${productsError.message}`);
    }
    
    // Step 6: Fetch product images
    const productsWithImages = await Promise.all(products.map(async (product) => {
      const { data: images } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', product.id)
        .limit(1);
      
      const orderInfo = orderProductMap.get(product.id) || { 
        orderId: '', 
        orderDate: new Date().toISOString() 
      };
      
      return {
        id: product.id,
        name: product.name,
        image: images && images.length > 0 ? images[0].url : '/placeholder.svg',
        orderId: orderInfo.orderId,
        orderDate: orderInfo.orderDate
      };
    }));
    
    return productsWithImages;
  } catch (error) {
    console.error('Error fetching reviewable products:', error);
    return [];
  }
}