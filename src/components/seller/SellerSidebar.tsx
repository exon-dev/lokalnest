import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  Tag,
  Users,
  Settings,
  Star,
  BarChart2,
  Boxes,
  Menu,
  ShieldCheck,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  variant: 'default' | 'ghost';
  badge?: string;
};

interface SellerSidebarProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
}

const SellerSidebar: React.FC<SellerSidebarProps> = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);

  // Check verification status directly from seller_verifications table
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: verificationData, error } = await supabase
          .from('seller_verifications')
          .select('status')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        // Set verified status if status is either 'approved' or 'verified'
        if (verificationData && verificationData.length > 0) {
          setIsVerified(verificationData[0].status === 'approved' || verificationData[0].status === 'verified');
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        setIsVerified(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      checkVerificationStatus();
      fetchUnreadMessageCount();
    }
  }, [user?.id]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('unread-message-count')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id=eq.${user.id}` 
        }, 
        () => {
          fetchUnreadMessageCount();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id=eq.${user.id}` 
        }, 
        () => {
          fetchUnreadMessageCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Fetch count of unread messages
  const fetchUnreadMessageCount = async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      
      setUnreadMessageCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  };

  const navItems: NavItem[] = [
    {
      title: 'Overview',
      href: '/seller/dashboard/overview',
      icon: <BarChart2 className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/overview' ? 'default' : 'ghost'
    },
    {
      title: 'Products',
      href: '/seller/dashboard/products',
      icon: <Package className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/products' ? 'default' : 'ghost'
    },
    {
      title: 'Inventory',
      href: '/seller/dashboard/inventory',
      icon: <Boxes className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/inventory' ? 'default' : 'ghost'
    },
    {
      title: 'Orders',
      href: '/seller/dashboard/orders',
      icon: <ShoppingCart className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/orders' ? 'default' : 'ghost'
    },
    {
      title: 'Messages',
      href: '/seller/dashboard/messages',
      icon: <MessageSquare className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/messages' ? 'default' : 'ghost',
      badge: unreadMessageCount > 0 ? unreadMessageCount.toString() : undefined
    },
    {
      title: 'Customers',
      href: '/seller/dashboard/customers',
      icon: <Users className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/customers' ? 'default' : 'ghost'
    },
    {
      title: 'Promotions',
      href: '/seller/dashboard/promotions',
      icon: <Tag className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/promotions' ? 'default' : 'ghost'
    },
    {
      title: 'Reviews',
      href: '/seller/dashboard/reviews',
      icon: <Star className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/reviews' ? 'default' : 'ghost'
    },
    {
      title: 'Settings',
      href: '/seller/dashboard/settings',
      icon: <Settings className="h-5 w-5" />,
      variant: currentPath === '/seller/dashboard/settings' ? 'default' : 'ghost'
    }
  ];

  return (
    <div className="pb-12 border border-border rounded-lg bg-background dark:bg-card">
      <div className="space-y-4 py-4">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{user.name}</h2>
              <div className="flex items-center">
                {isLoading ? (
                  <Badge variant="outline" className="text-xs">Loading...</Badge>
                ) : isVerified ? (
                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400 border-green-300 hover:bg-green-200 flex items-center">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-yellow-800 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-800/30 border-yellow-300 hover:bg-yellow-200 flex items-center cursor-pointer" onClick={() => navigate('/seller-verification')}>
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {!isVerified && !isLoading && (
          <div className="mx-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-md">
            <p className="text-xs text-yellow-800 dark:text-yellow-400">
              Your account is not verified. You need to upload your DTI Certificate to list products.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full text-xs border-yellow-300 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/60"
              onClick={() => navigate('/seller-verification')}
            >
              Verify Your Account
            </Button>
          </div>
        )}
        
        <div className="px-4">
          <p className="text-xs text-muted-foreground mb-1">
            Store Dashboard
          </p>
        </div>
        <div className="px-2">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item, i) => (
              <Link key={i} to={item.href}>
                <Button
                  variant={item.variant}
                  className={cn(
                    "w-full justify-start",
                    item.variant === 'default' &&
                    "bg-muted hover:bg-muted text-primary hover:text-primary dark:bg-muted/70 dark:hover:bg-muted/90 dark:text-primary-foreground"
                  )}
                >
                  {item.icon}
                  <span className="ml-2">{item.title}</span>
                  {item.badge && (
                    <Badge className="ml-auto bg-red-500 hover:bg-red-600" variant="default">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SellerSidebar;
