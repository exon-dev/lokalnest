import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/components/buyer/shopping/Cart';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from 'sonner';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { stripePromise, createPaymentIntent } from '@/services/stripeService';
import { createOrder, Order } from '@/services/orderService';
import { getDefaultAddress, getUserProfile } from '@/services/userService';
import StripeCardElement from '@/components/checkout/StripeCardElement';

const Checkout: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: ''
  });

  // If cart is empty, redirect to home
  useEffect(() => {
    if (items.length === 0) {
      navigate('/');
    }
  }, [items, navigate]);

  // Fetch user's shipping information from Supabase
  useEffect(() => {
    const fetchShippingInfo = async () => {
      setLoadingAddress(true);
      try {
        // Get user's default address
        const address = await getDefaultAddress();
        
        // Get user profile for name and phone
        const profile = await getUserProfile();
        
        if (address) {
          // Format the address from Supabase to match our form fields
          setShippingInfo({
            fullName: profile?.full_name || '',
            address: `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}`,
            city: address.city,
            province: address.state,
            postalCode: address.postal_code,
            phone: profile?.phone || ''
          });
        } else if (profile) {
          // Only set name and phone if no address is found
          setShippingInfo(prev => ({
            ...prev,
            fullName: profile.full_name || '',
            phone: profile.phone || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching shipping information:', error);
        toast.error('Could not load your shipping information.');
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchShippingInfo();
  }, []);

  // Initialize Stripe payment intent when payment method is set to stripe
  useEffect(() => {
    if (paymentMethod === 'stripe' && items.length > 0 && !clientSecret) {
      const fetchPaymentIntent = async () => {
        try {
          // Get the sellerId from the first item (assuming all items are from the same seller)
          // In a real app, you might need to handle multiple sellers
          const sellerId = items[0]?.seller || null;
          
          console.log('Creating payment intent for seller:', sellerId);
          // Create payment intent will work regardless of whether user has a seller profile or not
          const { clientSecret, paymentIntentId } = await createPaymentIntent(items, sellerId);
          setClientSecret(clientSecret);
          setPaymentIntentId(paymentIntentId);
        } catch (error) {
          console.error('Error creating payment intent:', error);
          toast.error('Could not initialize payment. Please try again.');
        }
      };

      fetchPaymentIntent();
    }
  }, [paymentMethod, items, clientSecret]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const validateShippingInfo = () => {
    for (const key in shippingInfo) {
      if (!shippingInfo[key as keyof typeof shippingInfo]) {
        toast.error(`Please enter your ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!validateShippingInfo()) {
      return;
    }
    
    setIsProcessing(true);

    try {
      // Format the shipping address
      const formattedAddress = `${shippingInfo.fullName}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.province} ${shippingInfo.postalCode}, Phone: ${shippingInfo.phone}`;
      
      // Check that we have items in the cart
      if (!items || items.length === 0) {
        toast.error('Your cart is empty');
        setIsProcessing(false);
        return;
      }

      console.log('Placing order with:', { 
        items: items.length,
        paymentMethod,
        address: formattedAddress
      });
      
      // Calculate total amount
      const totalAmount = totalPrice + shippingFee;
      
      // Prepare seller ID (assuming all items are from the same seller)
      // In a real app with multiple sellers, this would need to be handled differently
      const sellerId = items[0]?.seller || null;
      
      if (paymentMethod === 'cod') {
        // Process COD order
        console.log('Processing COD order...');
        try {
          const orderData: Partial<Order> = {
            seller_id: sellerId,
            status: 'pending',
            payment_method: 'cod',
            payment_status: 'pending',
            total_amount: totalAmount,
            shipping_address: formattedAddress,
            billing_address: formattedAddress
          };
          
          const order = await createOrder(orderData, items);
          
          console.log('COD order created successfully:', order);
          toast.success('Order placed successfully!');
          clearCart();
          navigate('/buyer/orders');
        } catch (codError: any) {
          console.error('COD order creation error:', codError);
          toast.error(codError.message || 'Failed to place your COD order. Please try again.');
        }
      } else if (paymentMethod === 'stripe' && paymentIntentId) {
        // For Stripe, the payment is processed by the StripeCardElement component
        // Here we just create the order with the payment_intent_id
        try {
          const orderData: Partial<Order> = {
            seller_id: sellerId,
            status: 'pending',
            payment_method: 'stripe',
            payment_status: 'processing',
            total_amount: totalAmount,
            shipping_address: formattedAddress,
            billing_address: formattedAddress
          };
          
          const order = await createOrder(orderData, items);
          
          // We'll update the order status when the payment succeeds
          // This is handled in the onPaymentSuccess callback
        } catch (stripeError: any) {
          console.error('Stripe order creation error:', stripeError);
          toast.error(stripeError.message || 'Failed to process your card payment. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('General checkout error:', error);
      toast.error(error.message || 'There was a problem processing your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const onPaymentSuccess = async (completedPaymentIntentId: string) => {
    try {
      // Format the shipping address
      const formattedAddress = `${shippingInfo.fullName}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.province} ${shippingInfo.postalCode}, Phone: ${shippingInfo.phone}`;
      
      // Calculate total amount
      const totalAmount = totalPrice + shippingFee;
      
      // Prepare seller ID (assuming all items are from the same seller)
      const sellerId = items[0]?.seller || null;
      
      // Create the order with the completed payment intent ID
      const orderData: Partial<Order> = {
        seller_id: sellerId,
        status: 'pending',
        payment_method: 'stripe',
        payment_status: 'paid',
        total_amount: totalAmount,
        shipping_address: formattedAddress,
        billing_address: formattedAddress
      };
      
      const order = await createOrder(orderData, items);
      
      // The order has been created and the payment has been processed
      toast.success('Payment successful! Your order has been placed.');
      clearCart();
      navigate('/buyer/orders');
    } catch (error) {
      toast.error('Payment was successful, but there was an issue creating your order.');
      console.error('Error after payment:', error);
    }
  };
  
  const onPaymentError = (error: Error) => {
    toast.error(`Payment failed: ${error.message}`);
    setIsProcessing(false);
  };
  
  const refreshShippingInfo = async () => {
    setLoadingAddress(true);
    try {
      const address = await getDefaultAddress();
      const profile = await getUserProfile();
      
      if (address) {
        setShippingInfo({
          fullName: profile?.full_name || '',
          address: `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}`,
          city: address.city,
          province: address.state,
          postalCode: address.postal_code,
          phone: profile?.phone || ''
        });
        toast.success('Shipping information updated');
      } else {
        toast.warning('No saved addresses found');
      }
    } catch (error) {
      console.error('Error refreshing shipping information:', error);
      toast.error('Could not refresh your shipping information');
    } finally {
      setLoadingAddress(false);
    }
  };
  
  const shippingFee = 50;
  const totalWithShipping = totalPrice + shippingFee;

  if (items.length === 0) {
    return null; // Don't render anything while redirecting
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 mt-16">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Shopping
        </Button>
        
        <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
        
        <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
            {/* Shipping Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Shipping Information</CardTitle>
                  <CardDescription>
                    Where you want your order to be delivered
                  </CardDescription>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={refreshShippingInfo}
                  disabled={loadingAddress}
                >
                  {loadingAddress ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {loadingAddress ? 'Loading...' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAddress ? (
                  <div className="py-8 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading your shipping information...</span>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleInputChange}
                        placeholder="123 Street Name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input 
                          id="city"
                          name="city"
                          value={shippingInfo.city}
                          onChange={handleInputChange}
                          placeholder="City"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="province">Province</Label>
                        <Input 
                          id="province"
                          name="province"
                          value={shippingInfo.province}
                          onChange={handleInputChange}
                          placeholder="Province"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input 
                          id="postalCode"
                          name="postalCode"
                          value={shippingInfo.postalCode}
                          onChange={handleInputChange}
                          placeholder="1234"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone"
                          name="phone"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          placeholder="+63 912 345 6789"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  Choose how you want to pay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value: 'stripe' | 'cod') => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 border rounded-md p-4 mb-3 cursor-pointer">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      <div className="font-medium">Credit/Debit Card</div>
                      <div className="text-sm text-muted-foreground">Pay securely with your card</div>
                    </Label>
                    <div className="flex gap-2">
                      <div className="h-8 w-12 rounded-md bg-muted flex items-center justify-center text-xs">Visa</div>
                      <div className="h-8 w-12 rounded-md bg-muted flex items-center justify-center text-xs">MC</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <div className="font-medium">Cash on Delivery</div>
                      <div className="text-sm text-muted-foreground">Pay when you receive your order</div>
                    </Label>
                    <div className="h-8 w-12 rounded-md bg-muted flex items-center justify-center text-xs">COD</div>
                  </div>
                </RadioGroup>

                {/* Card Element for Stripe */}
                {paymentMethod === 'stripe' && (
                  <div className="mt-4">
                    {clientSecret ? (
                      <Elements stripe={stripePromise}>
                        <StripeCardElement
                          clientSecret={clientSecret}
                          isProcessing={isProcessing}
                          onSuccess={onPaymentSuccess}
                          onError={onPaymentError}
                        />
                      </Elements>
                    ) : (
                      <div className="p-4 text-center">
                        <p>Loading payment form...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground flex-1">
                        {item.quantity} x {item.name.length > 20 
                          ? `${item.name.substring(0, 20)}...` 
                          : item.name}
                      </span>
                      <span>₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₱{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Fee</span>
                    <span>₱{shippingFee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>₱{totalWithShipping.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {paymentMethod === 'cod' && (
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isProcessing || loadingAddress}
                  >
                    {isProcessing ? 'Processing...' : `Place Order • ₱${totalWithShipping.toLocaleString()}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
