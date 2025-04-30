import React, { useState, useEffect } from 'react';
import { 
  CreditCard,
  Clock, 
  CheckCircle2, 
  XCircle,
  Plus,
  Loader2,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMethod {
  id: string;
  type: 'card' | 'cod';
  name: string;
  last4?: string;
  expiry?: string;
  isDefault: boolean;
}

const BuyerPayments = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "pm_1",
      type: 'card',
      name: 'Visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: "pm_2",
      type: 'cod',
      name: 'Cash on Delivery',
      isDefault: false
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const [newCardDetails, setNewCardDetails] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: ""
  });
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("card");

  // Enhanced Transaction interface to include product info
  interface TransactionProduct {
    name: string;
    image?: string;
  }

  // Update Transaction interface to include product info
  interface Transaction {
    id: string;
    date: string;
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    paymentMethod: string;
    products: TransactionProduct[];
  }

  // Fetch transaction history for the current buyer
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoadingTransactions(true);
      setTransactionError(null);

      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('You must be logged in to view your transactions');
        }
        
        const buyerId = session.user.id;
        
        // Fetch orders for the current buyer
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, created_at, total_amount, status, payment_status, payment_method')
          .eq('buyer_id', buyerId)
          .order('created_at', { ascending: false });
          
        if (ordersError) {
          throw ordersError;
        }

        // Fetch product details for each order
        const transformedTransactions: Transaction[] = await Promise.all(orders.map(async (order) => {
          // Get order items for this order
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', order.id);
            
          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return {
              id: order.id,
              date: order.created_at,
              amount: order.total_amount,
              description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
              status: mapPaymentStatusToTransactionStatus(order.payment_status, order.status),
              paymentMethod: formatPaymentMethodName(order.payment_method),
              products: []
            };
          }

          // Get product details for each item
          const products: TransactionProduct[] = [];
          
          for (const item of orderItems || []) {
            // Get product name
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', item.product_id)
              .single();

            // Get product image
            const { data: images } = await supabase
              .from('product_images')
              .select('url')
              .eq('product_id', item.product_id)
              .eq('is_primary', true)
              .limit(1);

            if (product) {
              products.push({
                name: product.name,
                image: images && images.length > 0 ? images[0].url : undefined
              });
            }
          }
          
          return {
            id: order.id,
            date: order.created_at,
            amount: order.total_amount,
            description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
            status: mapPaymentStatusToTransactionStatus(order.payment_status, order.status),
            paymentMethod: formatPaymentMethodName(order.payment_method),
            products
          };
        }));
        
        setTransactions(transformedTransactions);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        setTransactionError(error instanceof Error ? error.message : 'An error occurred');
        toast.error('Failed to load your transactions');
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    
    fetchTransactions();
  }, []);

  // Set up real-time subscription for order status updates
  useEffect(() => {
    const setupOrderSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const buyerId = session.user.id;

        // Subscribe to order status changes
        const channel = supabase
          .channel('order-payment-updates')
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'orders',
              filter: `buyer_id=eq.${buyerId}` 
            }, 
            (payload) => {
              console.log('Order status updated:', payload);
              
              // Update the relevant transaction in our state
              setTransactions(prev => 
                prev.map(transaction => {
                  if (transaction.id === payload.new.id) {
                    return {
                      ...transaction,
                      status: mapPaymentStatusToTransactionStatus(
                        payload.new.payment_status, 
                        payload.new.status
                      )
                    };
                  }
                  return transaction;
                })
              );
              
              // Show toast notification about the update
              if (payload.new.payment_status === 'approved' || payload.new.payment_status === 'paid') {
                toast.success(`Payment for order #${payload.new.id.slice(0, 8).toUpperCase()} has been approved!`);
              }
            }
          )
          .subscribe();

        // Cleanup subscription on component unmount
        return () => {
          channel.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up order subscription:', error);
      }
    };

    setupOrderSubscription();
  }, []);
  
  // Helper function to map payment status from DB to UI status
  const mapPaymentStatusToTransactionStatus = (paymentStatus: string, orderStatus: string): 'completed' | 'pending' | 'failed' => {
    // First check payment status
    if (paymentStatus === 'approved' || paymentStatus === 'paid') {
      return 'completed';
    } else if (paymentStatus === 'failed' || paymentStatus === 'rejected') {
      return 'failed';
    } 
    
    // Then check order status for additional context
    if (orderStatus === 'payment_approved' || orderStatus === 'shipped' || orderStatus === 'delivered') {
      return 'completed';
    } else if (orderStatus === 'cancelled') {
      return 'failed';
    }
    
    // Default to pending
    return 'pending';
  };
  
  // Helper function to format payment method name
  const formatPaymentMethodName = (method: string): string => {
    if (method.includes('card')) {
      return 'Credit/Debit Card';
    } else if (method.toLowerCase().includes('cod')) {
      return 'Cash on Delivery';
    } else {
      return method;
    }
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    setPaymentMethods(
      paymentMethods.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
    toast.success("Default payment method updated");
  };

  const handleRemovePaymentMethod = (id: string) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== id);
    
    // If we removed the default method, set a new default
    if (paymentMethods.find(m => m.id === id)?.isDefault && updatedMethods.length > 0) {
      updatedMethods[0].isDefault = true;
    }
    
    setPaymentMethods(updatedMethods);
    toast.success("Payment method removed");
  };

  const handleAddPaymentMethod = () => {
    // In a real app, this would validate and process the card with Stripe
    if (selectedPaymentMethod === 'card') {
      // Validate card details
      if (!newCardDetails.name || !newCardDetails.number || !newCardDetails.expiry || !newCardDetails.cvc) {
        toast.error("Please fill in all card details");
        return;
      }

      const last4 = newCardDetails.number.slice(-4);
      
      const newCard: PaymentMethod = {
        id: `pm_${Date.now()}`,
        type: 'card',
        name: 'Visa', // In a real app, would determine card type
        last4,
        expiry: newCardDetails.expiry,
        isDefault: paymentMethods.length === 0
      };
      
      setPaymentMethods([...paymentMethods, newCard]);
      toast.success("Card added successfully");
    } else if (selectedPaymentMethod === 'cod') {
      if (!paymentMethods.some(method => method.type === 'cod')) {
        const newCOD: PaymentMethod = {
          id: `pm_${Date.now()}`,
          type: 'cod',
          name: 'Cash on Delivery',
          isDefault: paymentMethods.length === 0
        };
        
        setPaymentMethods([...paymentMethods, newCOD]);
        toast.success("Cash on Delivery added as a payment method");
      } else {
        toast.error("Cash on Delivery is already added");
      }
    }
    
    setIsDialogOpen(false);
    setNewCardDetails({
      name: "",
      number: "",
      expiry: "",
      cvc: ""
    });
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-500 dark:border-green-400 dark:text-green-400">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400">Pending</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-red-500 text-red-500 dark:border-red-400 dark:text-red-400">Failed</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-semibold">Payments</h2>
          <p className="text-muted-foreground">Manage your payment methods and view transactions</p>
        </div>
      </div>

      <Tabs defaultValue="methods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="methods" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new payment method to your account.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card-option" />
                      <Label htmlFor="card-option">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cod" id="cod-option" />
                      <Label htmlFor="cod-option">Cash on Delivery</Label>
                    </div>
                  </RadioGroup>

                  {selectedPaymentMethod === 'card' && (
                    <div className="space-y-4 mt-4 border border-border rounded-md p-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Cardholder Name</Label>
                        <Input 
                          id="name" 
                          placeholder="John Doe"
                          value={newCardDetails.name}
                          onChange={(e) => setNewCardDetails({...newCardDetails, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Card Number</Label>
                        <Input 
                          id="number" 
                          placeholder="4242 4242 4242 4242"
                          value={newCardDetails.number}
                          onChange={(e) => setNewCardDetails({...newCardDetails, number: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input 
                            id="expiry" 
                            placeholder="MM/YY"
                            value={newCardDetails.expiry}
                            onChange={(e) => setNewCardDetails({...newCardDetails, expiry: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input 
                            id="cvc" 
                            placeholder="123"
                            value={newCardDetails.cvc}
                            onChange={(e) => setNewCardDetails({...newCardDetails, cvc: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod === 'cod' && (
                    <div className="mt-4 p-4 border border-border rounded-md">
                      <p className="text-sm">
                        By selecting Cash on Delivery, you agree to pay the full amount when your order is delivered to your address.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddPaymentMethod}>Add Payment Method</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {paymentMethods.map((method) => (
              <Card key={method.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {method.type === 'card' ? (
                        <CreditCard className="h-10 w-10 text-blue-500 dark:text-blue-400 mr-4" />
                      ) : (
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                          <span className="text-green-700 dark:text-green-400 font-bold">₱</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{method.name}{method.last4 ? ` •••• ${method.last4}` : ''}</h3>
                        {method.expiry && <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>}
                        {method.isDefault && <Badge variant="outline" className="mt-1">Default</Badge>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!method.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefaultPaymentMethod(method.id)}>
                          Set Default
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleRemovePaymentMethod(method.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {paymentMethods.length === 0 && (
              <div className="text-center py-10 border border-border rounded-lg">
                <p className="text-muted-foreground">No payment methods added yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View your recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading your transactions...</p>
                </div>
              ) : transactionError ? (
                <div className="text-center py-10">
                  <p className="text-red-500 mb-2">Error loading transactions</p>
                  <p className="text-sm text-muted-foreground">{transactionError}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 border border-border rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="font-semibold">₱{transaction.amount.toLocaleString()}</p>
                      </div>
                      
                      {/* Product Information Section */}
                      <div className="mt-2">
                        {transaction.products && transaction.products.length > 0 ? (
                          <div className="space-y-2">
                            {transaction.products.slice(0, 2).map((product, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                  {product.image ? (
                                    <img 
                                      src={product.image} 
                                      alt={product.name} 
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-secondary">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{product.name}</p>
                                </div>
                              </div>
                            ))}
                            
                            {/* Show count of additional products if there are more than 2 */}
                            {transaction.products.length > 2 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                +{transaction.products.length - 2} more items
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {transaction.description}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <div>{new Date(transaction.date).toLocaleDateString()}</div>
                        <div>{transaction.paymentMethod}</div>
                      </div>
                    </div>
                  ))}
                  
                  {transactions.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">No transactions yet</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerPayments;
