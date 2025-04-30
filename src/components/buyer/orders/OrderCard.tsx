import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Order } from './types';
import { OrderStatusBadge, OrderStatusIcon } from './OrderStatusBadge';
import OrderTrackingInfo from './OrderTrackingInfo';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, AlertCircle, Package, Truck, Calendar, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { submitReview } from '@/services/reviewService';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);
  const [review, setReview] = useState({
    rating: 5,
    content: ""
  });

  const handleOpenOrderDetails = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-product-item]') || 
        (e.target as HTMLElement).closest('[data-cancel-button]')) {
      return;
    }
    setIsOrderDetailsOpen(true);
  };

  const handleProductClick = (e: React.MouseEvent, item, itemIndex: number) => {
    e.stopPropagation();
    if (order.status === 'delivered') {
      const productId = item.product_id;
      
      if (!productId) {
        console.error("No product_id available for this item");
        toast.error("Cannot review this product: missing product ID");
        return;
      }
      
      setSelectedProduct({
        id: productId,
        name: item.name,
        image: item.image
      });
      setIsReviewDialogOpen(true);
    }
  };

  const handleRatingChange = (rating: number) => {
    setReview({ ...review, rating });
  };

  const renderStars = (rating: number, interactive = false) => {
    return Array(5).fill(0).map((_, i) => (
      <button
        key={i}
        className={`${interactive ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => interactive && handleRatingChange(i + 1)}
        type={interactive ? "button" : undefined}
      >
        <Star 
          className={`h-5 w-5 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} 
        />
      </button>
    ));
  };

  const handleSubmitReview = async () => {
    if (!selectedProduct) return;
    
    try {
      setIsSubmitting(true);
      
      const result = await submitReview({
        productId: selectedProduct.id,
        rating: review.rating,
        comment: review.content
      });
      
      if (result) {
        toast.success(`Review for ${selectedProduct.name} submitted successfully`);
        
        setIsReviewDialogOpen(false);
        setSelectedProduct(null);
        setReview({
          rating: 5,
          content: ""
        });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit your review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (order.status !== 'processing') {
      toast.error('Only orders in processing status can be cancelled');
      return;
    }
    
    try {
      setIsCancelling(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to cancel an order');
        return;
      }
      
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
        .eq('buyer_id', user.id);
        
      if (error) {
        throw error;
      }
      
      toast.success('Order cancelled successfully');
      setIsCancelDialogOpen(false);
      window.location.reload();
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel the order. Please try again or contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isDelivered = order.status === 'delivered';
  const canBeCancelled = order.status === 'processing';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Card 
        key={order.id} 
        className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
        onClick={handleOpenOrderDetails}
      >
        <CardHeader className="bg-muted/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle>Order #{order.id}</CardTitle>
              <CardDescription>Placed on {new Date(order.date).toLocaleDateString()}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <OrderStatusIcon status={order.status} />
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div 
                  key={idx}
                  data-product-item
                  className={`flex items-center space-x-4 ${isDelivered ? 'hover:bg-muted/50 rounded-md p-2 -m-2 cursor-pointer transition-colors' : ''}`}
                  onClick={(e) => isDelivered && handleProductClick(e, item, idx)}
                >
                  <div className="h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x ₱{item.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₱{(item.quantity * item.price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between pt-4 border-t border-border">
              <p className="font-semibold">Total</p>
              <p className="font-semibold">₱{order.total.toLocaleString()}</p>
            </div>

            {order.tracking && (
              <OrderTrackingInfo order={order} tracking={order.tracking} />
            )}

            {isDelivered && (
              <div className="text-center pt-4 text-sm text-muted-foreground">
                Click on any product to leave a review
              </div>
            )}
            
            {canBeCancelled && (
              <div className="flex justify-end pt-4">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  data-cancel-button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCancelDialogOpen(true);
                  }}
                >
                  Cancel Order
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="mr-2">Order Details</div>
              <OrderStatusBadge status={order.status} />
            </DialogTitle>
            <DialogDescription>
              Order #{order.id} • Placed on {new Date(order.date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Items</h3>
              <div className="space-y-4 border rounded-md p-4">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="font-medium text-sm">{item.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm">₱{item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm">₱{(item.quantity * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-medium text-sm">Items Subtotal</td>
                      <td className="px-4 py-3 text-right font-medium text-sm">₱{order.items.reduce((sum, item) => sum + item.quantity * item.price, 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-medium text-sm">Shipping Fee (Standard)</td>
                      <td className="px-4 py-3 text-right font-medium text-sm">₱150.00</td>
                    </tr>
                    <tr className="bg-muted/50">
                      <td colSpan={3} className="px-4 py-3 text-right font-medium">Total</td>
                      <td className="px-4 py-3 text-right font-bold">₱{order.total.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Shipping Information</h3>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Delivery Address</p>
                      <p className="text-sm text-muted-foreground">
                        123 San Pedro St., Barangay San Jose, Quezon City,
                        Metro Manila, 1100 Philippines
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Contact Number</p>
                      <p className="text-sm text-muted-foreground">+63 912 345 6789</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Order Status</h3>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <OrderStatusIcon status={order.status} />
                    <span className="font-medium">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                  </div>
                  
                  {order.tracking && (
                    <>
                      <div className="flex items-start space-x-2">
                        <Truck className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="font-medium">Tracking Number</p>
                          <p className="text-sm text-muted-foreground">{order.tracking.id}</p>
                          <p className="text-sm text-muted-foreground">{order.tracking.courier}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="font-medium">Estimated Delivery</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.tracking.estimatedDelivery).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {order.tracking && order.tracking.updates && order.tracking.updates.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Updates</h4>
                    <div className="border rounded-md p-4 space-y-3">
                      {order.tracking.updates.slice(0, 2).map((update, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium">{update.status}</p>
                          <p className="text-muted-foreground">{update.location} • {update.timestamp}</p>
                        </div>
                      ))}
                      
                      {order.tracking.updates.length > 2 && (
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <a href="#" onClick={(e) => {
                            e.preventDefault();
                            setIsOrderDetailsOpen(false);
                          }}>
                            View all updates
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              {canBeCancelled && (
                <Button 
                  variant="destructive" 
                  onClick={(e) => {
                    setIsOrderDetailsOpen(false);
                    setTimeout(() => setIsCancelDialogOpen(true), 100);
                  }}
                >
                  Cancel Order
                </Button>
              )}
              
              {order.tracking && (
                <Button variant="secondary" asChild>
                  <a href={order.tracking.url} target="_blank" rel="noopener noreferrer">
                    Track Order
                  </a>
                </Button>
              )}
              
              <Button onClick={() => setIsOrderDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Product</DialogTitle>
            <DialogDescription>
              Share your thoughts about {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 rounded-md overflow-hidden bg-muted">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover" 
                  />
                </div>
                <h3 className="font-medium">{selectedProduct.name}</h3>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Rating</p>
                <div className="flex">
                  {renderStars(review.rating, true)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Your Review</p>
                <Textarea 
                  placeholder="Write your review here..." 
                  value={review.content}
                  onChange={(e) => setReview({...review, content: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center p-4 border border-red-200 bg-red-50 rounded-md mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">
                Once cancelled, your order will not be processed. Any payment made will be refunded according to our refund policy.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Order Details:</p>
              <p className="text-sm">Order #{order.id}</p>
              <p className="text-sm">Total: ₱{order.total.toLocaleString()}</p>
              <p className="text-sm">Items: {order.items.length}</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCancelDialogOpen(false)} 
              disabled={isCancelling}
            >
              Keep Order
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelOrder} 
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderCard;
