import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, CheckCheck, Truck, ShoppingBag, CreditCard, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Notification,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [isBuyer, setIsBuyer] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    checkUserType();
  }, []);

  const checkUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const accountType = user.user_metadata?.account_type;
    if (accountType?.toLowerCase() === 'seller') {
      setIsBuyer(false);
    } else if (accountType?.toLowerCase() === 'buyer') {
      setIsBuyer(true);
    } else {
      // Check if user has a seller profile
      try {
        const { data: sellerProfile } = await supabase
          .from('seller_profiles')
          .select('id')
          .eq('id', user.id)
          .single();
        
        setIsBuyer(!sellerProfile);
      } catch (error) {
        // Default to buyer if error
        setIsBuyer(true);
      }
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await getNotifications(50); // Get up to 50 notifications
      setNotifications(notifs);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark notifications as read");
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read) return; // Skip if already read
    
    try {
      await markAsRead(notification.id);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification);
    
    // Add debug logging
    console.log('NotificationsPage - Clicked notification:', notification);
    console.log('NotificationsPage - Notification data:', notification.data);
    console.log('NotificationsPage - Notification type:', notification.type);
    
    // Navigate based on notification type
    switch (notification.type) {
      // Seller notifications
      case 'new_order':
        if (notification.data?.order_id) {
          console.log('NotificationsPage - Navigating to specific order:', notification.data.order_id);
          navigate(`/seller/dashboard/orders`);
        } else {
          console.log('NotificationsPage - Navigating to general orders page - missing order_id');
          navigate('/seller/dashboard/orders');
        }
        break;
      case 'low_stock':
        navigate('/seller/dashboard/products');
        break;
      case 'new_review':
      case 'review':
        console.log('NotificationsPage - Navigating to seller reviews page');
        navigate('/seller/dashboard/reviews');
        break;

      // Buyer order status notifications
      case 'payment_approved':
      case 'shipped':
      case 'delivered':
        console.log('NotificationsPage - Navigating to buyer orders page');
        navigate('/buyer/orders');
        break;
        
      // Buyer review notifications
      case 'review_reply':
        if (notification.data?.product_id) {
          navigate(`/product/${notification.data.product_id}`);
        } else if (notification.data?.review_id) {
          navigate(`/reviews/${notification.data.review_id}`);
        }
        break;
      
      // Buyer shopping notifications  
      case 'price_drop':
      case 'restocked':
        if (notification.data?.product_id) {
          navigate(`/product/${notification.data.product_id}`);
        }
        break;
      case 'promotion':
        navigate('/promotions');
        break;
      default:
        // Don't navigate
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    // Return appropriate icon based on notification type
    switch (type) {
      // Seller notification icons
      case 'new_order':
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case 'low_stock':
        return <Bell className="h-5 w-5 text-warning" />;
      case 'new_review':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      
      // Buyer order status icons  
      case 'payment_approved':
        return <CreditCard className="h-5 w-5 text-success" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-primary" />;
      case 'delivered':
        return <ShoppingBag className="h-5 w-5 text-success" />;
      case 'review_reply':
        return <MessageCircle className="h-5 w-5 text-primary" />;
      
      // General icons
      case 'price_drop':
      case 'restocked':
      case 'promotion':
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };
  
  const hasUnreadNotifications = notifications.some(n => !n.read);
  
  // Function to get filtered notifications based on user type
  const getFilteredNotifications = () => {
    if (isBuyer === null) return notifications; // If user type not determined yet
    
    return notifications.filter(notification => {
      const type = notification.type;
      
      // Seller notifications
      if (!isBuyer) {
        return ['new_order', 'low_stock', 'new_review'].includes(type);
      }
      
      // Buyer notifications - now includes more specific order status types
      return [
        'payment_approved', 'shipped', 'delivered', 'review_reply',
        'price_drop', 'restocked', 'promotion'
      ].includes(type);
    });
  };

  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">View and manage your notifications</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Notifications</CardTitle>
              <CardDescription>
                {filteredNotifications.length === 0 
                  ? "You don't have any notifications yet" 
                  : `You have ${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </div>
            {hasUnreadNotifications && (
              <Button 
                onClick={handleMarkAllAsRead} 
                variant="outline"
                disabled={markingAllAsRead}
              >
                {markingAllAsRead ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications to display</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <div 
                      className={`py-4 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/30' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className={`text-base font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                    {index < filteredNotifications.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationsPage;