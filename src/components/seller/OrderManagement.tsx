import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  MoreHorizontal, 
  Calendar, 
  Tag, 
  Package, 
  CreditCard,
  Truck,
  ClipboardCheck,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateOrderStatus, OrderStatus } from "@/services/orderService";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image?: string;
}

interface Order {
  id: string;
  date: string;
  buyer_id: string;
  buyer_name?: string;
  items: OrderItem[];
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: string;
  delivery_option?: string;
  estimated_delivery?: string;
  shipping_fee?: number; // Adding shipping fee field
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to view orders');
        navigate('/auth');
        return;
      }

      // Direct approach: Query orders by seller_id
      const { data: orderDetails, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, buyer_id, total_amount, status, payment_status, payment_method, shipping_address, estimated_delivery')
        .eq('seller_id', session.user.id);
        
      if (orderError) throw orderError;
      
      if (!orderDetails || orderDetails.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // Get buyer profiles
      const buyerIds = [...new Set(orderDetails.map(order => order.buyer_id))];
      const buyerProfiles = {};
      
      for (const buyerId of buyerIds) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', buyerId)
          .single();
            
        buyerProfiles[buyerId] = profile?.full_name || 'Customer';
      }
      
      // Get order items for these orders
      const orderItems = [];
      const orderIdList = orderDetails.map(order => order.id);
      
      for (const orderId of orderIdList) {
        const { data: items } = await supabase
          .from('order_items')
          .select('id, order_id, product_id, quantity, unit_price, total_price')
          .eq('order_id', orderId);
          
        if (items && items.length > 0) {
          orderItems.push(...items);
        }
      }
      
      // Get product details
      const productIds = [...new Set(orderItems.map(item => item.product_id))];
      const productDetails = {};
      const productImages = {};
      
      for (const productId of productIds) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name')
          .eq('id', productId)
          .single();
          
        productDetails[productId] = product?.name || 'Unknown Product';
        
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', productId)
          .eq('is_primary', true)
          .limit(1);
          
        productImages[productId] = images && images.length > 0 ? images[0].url : undefined;
      }
      
      // Build the complete orders
      const completeOrders = orderDetails.map(order => {
        // Find items for this order
        const items = orderItems
          .filter(item => item.order_id === order.id)
          .map(item => {
            return {
              id: item.id,
              product_id: item.product_id,
              product_name: productDetails[item.product_id],
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              image: productImages[item.product_id]
            };
          });
          
        const itemsSubtotal = items.reduce((sum, item) => sum + item.total_price, 0);
        const shippingFee = Math.max(0, order.total_amount - itemsSubtotal);
        
        return {
          id: order.id,
          date: order.created_at,
          buyer_id: order.buyer_id,
          buyer_name: buyerProfiles[order.buyer_id],
          items,
          total: order.total_amount,
          status: order.status,
          payment_status: order.payment_status,
          payment_method: order.payment_method,
          shipping_address: order.shipping_address,
          delivery_option: 'standard',
          estimated_delivery: order.estimated_delivery,
          shipping_fee: shippingFee
        };
      });
      
      setOrders(completeOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOrderStatusChange = async (orderId: string, status: string) => {
    try {
      const orderToUpdate = orders.find(order => order.id === orderId);
      if (!orderToUpdate) {
        toast.error('Order not found');
        return;
      }
      
      let success = false;
      
      // For notifiable status changes, use the imported updateOrderStatus that sends notifications
      if (status === 'shipped' || status === 'delivered' || status === 'payment_approved') {
        success = await updateOrderStatus(orderId, status as OrderStatus);
        
        // For COD orders if status is delivered, also update payment status locally
        if (success && status === 'delivered' && orderToUpdate?.payment_method?.toLowerCase() === 'cash on delivery') {
          // Update payment status separately since the service function doesn't handle this
          const { error: paymentUpdateError } = await supabase
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', orderId);
            
          if (paymentUpdateError) throw paymentUpdateError;
          
          // Update local state including payment status
          setOrders(orders.map(order => 
            order.id === orderId ? { ...order, status, payment_status: 'paid' } : order
          ));
          
          toast.success(`Order status updated to ${status}`);
          toast.success(`Payment status automatically updated to paid for COD order`);
        } else if (success) {
          // Just update local state with the new status
          setOrders(orders.map(order => 
            order.id === orderId ? { ...order, status } : order
          ));
          
          toast.success(`Order status updated to ${status}`);
        } else {
          toast.error(`Failed to update order status to ${status}`);
        }
      } else {
        // For other statuses that don't need buyer notifications, use direct update
        const { error: statusUpdateError } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);
          
        if (statusUpdateError) throw statusUpdateError;
        
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
        
        toast.success(`Order status updated to ${status}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const updatePaymentStatus = async (orderId: string, status: string) => {
    try {
      // Get the order to ensure we have the buyer_id
      const orderToUpdate = orders.find(order => order.id === orderId);
      if (!orderToUpdate) {
        toast.error('Order not found');
        return;
      }

      // First update payment_status directly to ensure it triggers database listeners
      const { error: paymentStatusError } = await supabase
        .from('orders')
        .update({ payment_status: 'approved' })
        .eq('id', orderId);
        
      if (paymentStatusError) {
        console.error('Error updating payment status:', paymentStatusError);
        toast.error('Failed to update payment status');
        return;
      }

      // Then use the imported updateOrderStatus function that sends notifications
      const success = await updateOrderStatus(orderId, 'payment_approved' as OrderStatus);
      
      if (success) {
        // Update local state with both status changes
        setOrders(orders.map(order => 
          order.id === orderId ? { 
            ...order, 
            status: 'payment_approved', 
            payment_status: 'approved' 
          } : order
        ));
        
        toast.success(`Payment approved and order status updated`);
      } else {
        toast.error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  // Filter and sort orders
  const filteredOrders = orders.filter(order => {
    // Search term filter
    const searchMatch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      order.items.some(item => 
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Status filter
    const statusMatch = 
      statusFilter === 'all' || 
      order.status === statusFilter;
    
    // Time filter
    let timeMatch = true;
    const now = new Date();
    const orderDate = new Date(order.date);
    
    if (timeFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      timeMatch = orderDate >= today;
    } else if (timeFilter === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      timeMatch = orderDate >= startOfWeek;
    } else if (timeFilter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      timeMatch = orderDate >= startOfMonth;
    }
    
    return searchMatch && statusMatch && timeMatch;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else if (sortBy === 'date_asc') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'total_desc') {
      return b.total - a.total;
    } else {
      return a.total - b.total;
    }
  });

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Refunded</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatOrderDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const formatFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'PPP p'); // Format: Jan 1, 2023, 12:00 PM
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 w-full sm:w-[300px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Newest First</SelectItem>
                  <SelectItem value="date_asc">Oldest First</SelectItem>
                  <SelectItem value="total_desc">Highest Amount</SelectItem>
                  <SelectItem value="total_asc">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sortedOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="border-collapse w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Order Info</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>Order #{order.id.split('-')[0]}</p>
                          <div className="flex items-center text-muted-foreground text-xs gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatOrderDate(order.date)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{order.buyer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[250px]">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded overflow-hidden bg-muted flex-shrink-0">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.product_name} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-medium truncate">{item.product_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} × ₱{item.unit_price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs">{order.payment_method}</p>
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">₱{order.total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* Only show status change options if the order is not cancelled */}
                            {order.status !== 'cancelled' ? (
                              <>
                                <DropdownMenuItem onClick={() => updatePaymentStatus(order.id, 'approved')}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  {order.status === 'approved' ? 'Payment Already Approved' : 'Approve Payment'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'processing')}>
                                  <Tag className="mr-2 h-4 w-4" />
                                  Mark as Processing
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'shipped')}>
                                  <Truck className="mr-2 h-4 w-4" />
                                  Mark as Shipped
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'delivered')}>
                                  <ClipboardCheck className="mr-2 h-4 w-4" />
                                  Mark as Delivered{order.payment_method?.toLowerCase() === 'cash on delivery' && ' (Will update COD payment)'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => handleOrderStatusChange(order.id, 'cancelled')}>
                                  <X className="mr-2 h-4 w-4" />
                                  Mark as Cancelled
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                              </>
                            ) : null}
                            
                            <DropdownMenuItem onClick={() => openOrderDetails(order)}>
                              <Package className="mr-2 h-4 w-4" />
                              View Order Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || timeFilter !== 'all'
                  ? 'Try adjusting your search filters.'
                  : "You haven't received any orders yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order ID: ${selectedOrder.id}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Order Information</h3>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p><strong>Date:</strong> {formatFullDate(selectedOrder.date)}</p>
                    <p><strong>Status:</strong> {selectedOrder.status}</p>
                    <p><strong>Payment Method:</strong> {selectedOrder.payment_method}</p>
                    <p><strong>Payment Status:</strong> {selectedOrder.payment_status}</p>
                    {selectedOrder.delivery_option && (
                      <p><strong>Delivery Option:</strong> {selectedOrder.delivery_option}</p>
                    )}
                    {selectedOrder.estimated_delivery && (
                      <p><strong>Estimated Delivery:</strong> {formatFullDate(selectedOrder.estimated_delivery)}</p>
                    )}
                    {selectedOrder.shipping_fee !== undefined && (
                      <p><strong>Shipping Fee:</strong> ₱{selectedOrder.shipping_fee.toFixed(2)}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Customer Information</h3>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p><strong>Name:</strong> {selectedOrder.buyer_name}</p>
                    <p><strong>Shipping Address:</strong> {selectedOrder.shipping_address.split(', Phone:')[0]}</p>
                    <p><strong>Phone:</strong> {selectedOrder.shipping_address.includes('Phone:') ? 
                      selectedOrder.shipping_address.split('Phone:')[1].trim() : 'Not provided'}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Order Items</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                {item.image ? (
                                  <img 
                                    src={item.image} 
                                    alt={item.product_name} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <span>{item.product_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₱{item.total_price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Calculate subtotal */}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Items Subtotal</TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{selectedOrder.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {/* Shipping Fee */}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Shipping Fee</TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{(selectedOrder.shipping_fee || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {/* Order Total */}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Order Total</TableCell>
                        <TableCell className="text-right font-bold">₱{selectedOrder.total.toFixed(2)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;