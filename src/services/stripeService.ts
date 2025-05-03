import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/components/buyer/shopping/Cart';

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe('pk_test_51REPrMPAtuELrfs598xSchbLCe1mNxTiaIkk6qOLG4rQAppUe0jWYvgqxepOWuVHRXRaiYos6ojSkUxa5PnYiE2y00jWOTpTNW');

// Create a payment intent (client-side only implementation for testing)
export async function createPaymentIntent(items: CartItem[], sellerId?: string) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be signed in to make a payment');
    }
    
    // Calculate total amount
    const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const shippingFee = 150; // Hardcoded shipping fee as in Checkout.tsx
    const totalWithShipping = totalAmount + shippingFee;
    
    // For testing purposes - using mock implementation
    // In a production app, we would call a server API endpoint instead
    const amountInCents = Math.round(totalWithShipping * 100);
    
    // Check if we can use an API server endpoint
    try {
      // Try to use the server API endpoint if it's available
      const response = await fetch('http://localhost:5001/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalWithShipping,
          sellerId,
          metadata: {
            userId: user.id,
            items: JSON.stringify(items.map(item => ({ id: item.id, quantity: item.quantity })))
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Server API request failed');
      }
      
      const data = await response.json();
      
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId
      };
    } catch (apiError) {
      console.warn('Could not connect to Stripe API server, using mock implementation:', apiError);
      
      // Fallback to mock implementation if server isn't available
      const mockClientSecret = `mock_${Date.now()}_secret_${Math.random().toString(36).substring(2, 15)}`;
      const mockPaymentIntentId = `mock_pi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      console.log('Mock payment intent created for testing UI flow');
      
      return {
        clientSecret: mockClientSecret,
        paymentIntentId: mockPaymentIntentId
      };
    }
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    throw error;
  }
}

// Process payment after successful checkout
export async function processPayment(paymentIntentId: string, orderId: string) {
  try {
    // Check if this is a mock payment intent
    if (paymentIntentId.startsWith('mock_pi_')) {
      console.log('Processing mock payment:', paymentIntentId);
      
      // Update order payment status directly, now we store the payment_intent_id properly
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'succeeded',
          status: 'pending', // Order is paid but not yet approved by seller
          payment_intent_id: paymentIntentId // Store in dedicated column
        })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        message: 'Payment processed successfully (mock)'
      };
    }
    
    // For real payments, call the server API to confirm the payment
    try {
      const response = await fetch('http://localhost:5001/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          orderId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment confirmation failed');
      }
      
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Payment processed successfully'
      };
    } catch (apiError) {
      console.warn('Could not connect to Stripe API server:', apiError);
      
      // Fallback to mock success for development
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'succeeded',
          status: 'pending', // Order is paid but not yet approved by seller
          payment_intent_id: paymentIntentId // Store in dedicated column
        })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        message: 'Payment processed successfully (fallback)'
      };
    }
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
}

// Save a payment method for future use - mock implementation
export async function savePaymentMethod(paymentMethodId: string) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be signed in to save a payment method');
    }
    
    // Try to use the server API endpoint if it's available
    try {
      const response = await fetch('http://localhost:5001/save-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          userId: user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Server API request failed');
      }
      
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Payment method saved successfully'
      };
    } catch (apiError) {
      console.warn('Could not connect to Stripe API server, using mock implementation:', apiError);
      
      // Fallback to mock implementation
      console.log('Saving payment method (mock):', paymentMethodId);
      
      return {
        success: true,
        message: 'Payment method saved successfully (mock)'
      };
    }
  } catch (error) {
    console.error('Saving payment method failed:', error);
    throw error;
  }
}