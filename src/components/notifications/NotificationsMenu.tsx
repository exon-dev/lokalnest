import React, { useState, useEffect } from 'react';
import { Bell, Truck, ShoppingBag, CreditCard, MessageCircle } from 'lucide-react';
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
import { Notification, getNotifications, getUnreadCount, markAllAsRead, markAsRead } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationsMenu = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(5),
        getUnreadCount()
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
      // Update local state to reflect read status
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Add debug logging
    console.log('Clicked notification:', notification);
    console.log('Notification data:', notification.data);
    console.log('Notification type:', notification.type);
    
    // Handle navigation based on notification type
    switch (notification.type) {
      // Seller notifications
      case 'new_order':
        if (notification.data?.order_id) {
          console.log('Navigating to specific order:', notification.data.order_id);
          navigate(`/seller/dashboard/orders`);
        } else {
          console.log('Navigating to general orders page - missing order_id');
          navigate('/seller/dashboard/orders');
        }
        break;
      case 'low_stock':
        navigate('/seller/dashboard/products');
        break;
      case 'new_review':
      case 'review':
        console.log('Navigating to seller reviews page');
        navigate('/seller/dashboard/reviews');
        break;

      // Buyer order status notifications
      case 'payment_approved':
      case 'shipped':
      case 'delivered':
        if (notification.data?.order_id) {
          console.log('Navigating to specific buyer order:', notification.data.order_id);
          navigate('/buyer/orders');
        } else {
          console.log('Navigating to general buyer orders page');
          navigate('/buyer/orders');
        }
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
        // Default just closes the dropdown
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    // Return appropriate icon based on notification type
    switch (type) {
      // Seller notification icons
      case 'new_order':
        return <ShoppingBag className="h-4 w-4 mr-2" />;
      case 'low_stock':
        return <Bell className="h-4 w-4 mr-2" />;
      case 'new_review':
        return <MessageCircle className="h-4 w-4 mr-2" />;
      
      // Buyer order status icons  
      case 'payment_approved':
        return <CreditCard className="h-4 w-4 mr-2" />;
      case 'shipped':
        return <Truck className="h-4 w-4 mr-2" />;
      case 'delivered':
        return <ShoppingBag className="h-4 w-4 mr-2" />;
      case 'review_reply':
        return <MessageCircle className="h-4 w-4 mr-2" />;
      
      // General icons
      case 'price_drop':
      case 'restocked':
      case 'promotion':
      default:
        return <Bell className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-4 px-2 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className={`cursor-pointer p-3 ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </div>
        
        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-8" 
            onClick={() => navigate('/notifications')}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsMenu;