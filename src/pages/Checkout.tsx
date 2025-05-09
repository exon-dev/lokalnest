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
import { ChevronLeft, RefreshCw, Truck, Clock, Calendar } from 'lucide-react';
import { stripePromise, createPaymentIntent } from '@/services/stripeService';
import { createOrder } from '@/services/orderService';
import { getDefaultAddress, getUserProfile } from '@/services/userService';
import StripeCardElement from '@/components/checkout/StripeCardElement';
import { addBusinessDays, format } from 'date-fns';

const Checkout: React.FC = () => {
  const { selectedItems, selectedItemsTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cod'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string>('standard');
  
  // Define delivery options with business days for estimated delivery
  const deliveryOptions = [
    { 
      id: 'standard', 
      name: 'Standard Delivery', 
      description: '3-5 business days', 
      fee: 50,
      minDays: 3,
      maxDays: 5
    },
    { 
      id: 'express', 
      name: 'Express Delivery', 
      description: '1-2 business days', 
      fee: 100,
      minDays: 1,
      maxDays: 2
    },
    { 
      id: 'maxim', 
      name: 'Maxim Same-day', 
      description: 'Same day delivery', 
      fee: 150,
      minDays: 0,
      maxDays: 1
    }
  ];
  
  // Get selected delivery option
  const selectedDeliveryFee = deliveryOptions.find(option => option.id === selectedDeliveryOption)?.fee || 50;
  const selectedDeliveryDetails = deliveryOptions.find(option => option.id === selectedDeliveryOption);
  
  // Calculate estimated delivery date
  const calculateEstimatedDelivery = () => {
    if (!selectedDeliveryDetails) return null;
    
    const today = new Date();
    // Use the maximum days for a safe estimate
    const estimatedDate = addBusinessDays(today, selectedDeliveryDetails.maxDays);
    return estimatedDate.toISOString();
  };
  
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: ''
  });

  // If no items are selected, redirect to home
  useEffect(() => {
    if (selectedItems.length === 0) {
      toast.error('No items selected for checkout');
      navigate('/');
    }
  }, [selectedItems, navigate]);

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
    if (paymentMethod === 'stripe' && selectedItems.length > 0 && !clientSecret) {
      const fetchPaymentIntent = async () => {
        try {
          // Get the sellerId from the first item (assuming all items are from the same seller)
          const sellerId = selectedItems[0]?.seller || null;
          
          console.log('Creating payment intent for seller:', sellerId);
          // Create payment intent will work regardless of whether user has a seller profile or not
          const { clientSecret, paymentIntentId } = await createPaymentIntent(selectedItems, sellerId);
          setClientSecret(clientSecret);
          setPaymentIntentId(paymentIntentId);
        } catch (error) {
          console.error('Error creating payment intent:', error);
          toast.error('Could not initialize payment. Please try again.');
        }
      };

      fetchPaymentIntent();
    }
  }, [paymentMethod, selectedItems, clientSecret]);

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
      if (!selectedItems || selectedItems.length === 0) {
        toast.error('No items selected for checkout');
        setIsProcessing(false);
        return;
      }

      // Calculate estimated delivery date
      const estimatedDelivery = calculateEstimatedDelivery();

      console.log('Placing order with:', { 
        items: selectedItems.length,
        paymentMethod,
        address: formattedAddress,
        deliveryOption: selectedDeliveryOption,
        estimatedDelivery
      });
      
      // Get the seller ID from the first item (assuming all items are from the same seller)
      const sellerId = selectedItems[0]?.seller || null;
      
      // Prepare order data object with all required fields
      const orderData = {
        seller_id: sellerId,
        shipping_address: formattedAddress,
        billing_address: formattedAddress,
        payment_method: paymentMethod,
        total_amount: totalWithShipping,
        delivery_option: selectedDeliveryOption,
        estimated_delivery: estimatedDelivery
      };
      
      if (paymentMethod === 'cod') {
        // Process COD order
        console.log('Processing COD order...');
        try {
          const orderId = await createOrder(orderData, selectedItems);
          
          console.log('COD order created successfully:', orderId);
          toast.success('Order placed successfully!');
          clearCart();
          navigate('/buyer/orders');
        } catch (codError: any) {
          console.error('COD order creation error:', codError);
          toast.error(codError.message || 'Failed to place your COD order. Please try again.');
        }
      } else if (paymentMethod === 'stripe') {
        // For Stripe, StripeCardElement component handles the payment
        // Don't create the order here - it will be created in onPaymentSuccess
        console.log('Ready for Stripe payment processing with client secret:', clientSecret ? 'Present' : 'Missing');
        
        // The StripeCardElement will handle payment and call onPaymentSuccess/onPaymentError
        if (!clientSecret) {
          toast.error('Payment system is not ready yet. Please try again.');
          setIsProcessing(false);
        }
        // Otherwise, let the StripeCardElement handle it
      }
    } catch (error: any) {
      console.error('General checkout error:', error);
      toast.error(error.message || 'There was a problem processing your order. Please try again.');
      setIsProcessing(false);
    }
  };
  
  const onPaymentSuccess = async (completedPaymentIntentId: string) => {
    try {
      // Format the shipping address
      const formattedAddress = `${shippingInfo.fullName}, ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.province} ${shippingInfo.postalCode}, Phone: ${shippingInfo.phone}`;
      
      // Get the seller ID from the first item
      const sellerId = selectedItems[0]?.seller || null;
      
      // Calculate estimated delivery date
      const estimatedDelivery = calculateEstimatedDelivery();
      
      // Create proper order data
      const orderData = {
        seller_id: sellerId,
        shipping_address: formattedAddress,
        billing_address: formattedAddress,
        payment_method: 'stripe',
        payment_intent_id: completedPaymentIntentId, // This will be stored in payment_method column as stripe:paymentIntentId
        payment_status: 'succeeded',
        total_amount: totalWithShipping,
        delivery_option: selectedDeliveryOption,
        estimated_delivery: estimatedDelivery
      };
      
      console.log('Creating order after successful payment:', completedPaymentIntentId);
      
      try {
        // Create the order with the completed payment intent ID
        const orderId = await createOrder(orderData, selectedItems);
        
        if (!orderId) {
          throw new Error('Failed to create order: No order ID returned');
        }
        
        console.log('Order created successfully:', orderId);
        
        // The order has been created and the payment has been processed
        toast.success('Payment successful! Your order has been placed.');
        clearCart();
        navigate('/buyer/orders');
      } catch (orderError: any) {
        console.error('Failed to create order after payment:', orderError);
        toast.error(orderError.message || 'Payment was successful, but there was an issue creating your order.');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Error after payment:', error);
      toast.error('Payment was successful, but there was an issue creating your order.');
      setIsProcessing(false);
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
  
  const totalWithShipping = selectedItemsTotal + selectedDeliveryFee;

  // Format estimated delivery date for display
  const getFormattedEstimatedDelivery = () => {
    const estimatedDate = calculateEstimatedDelivery();
    return estimatedDate ? format(new Date(estimatedDate), 'MMMM d, yyyy') : 'Unknown';
  };

  if (selectedItems.length === 0) {
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

            {/* Delivery Options */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Options</CardTitle>
                <CardDescription>
                  Choose your preferred delivery method
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedDeliveryOption} 
                  onValueChange={setSelectedDeliveryOption}
                  className="space-y-3"
                >
                  {deliveryOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2 border rounded-md p-4 cursor-pointer">
                      <RadioGroupItem value={option.id} id={`delivery-${option.id}`} />
                      <Label htmlFor={`delivery-${option.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium flex items-center">
                          <Truck className="h-4 w-4 mr-2" /> {option.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" /> {option.description}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" /> 
                          {option.id === selectedDeliveryOption && (
                            <span>Estimated delivery: {getFormattedEstimatedDelivery()}</span>
                          )}
                        </div>
                      </Label>
                      <div className="font-medium">₱{option.fee.toLocaleString()}</div>
                    </div>
                  ))}
                </RadioGroup>
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
                  {selectedItems.map(item => (
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
                    <span>₱{selectedItemsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Fee ({deliveryOptions.find(o => o.id === selectedDeliveryOption)?.name})</span>
                    <span>₱{selectedDeliveryFee.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>₱{totalWithShipping.toLocaleString()}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex items-center mt-2">
                  <Calendar className="h-4 w-4 mr-2" /> 
                  Estimated delivery: {getFormattedEstimatedDelivery()}
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