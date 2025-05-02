import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  ShoppingBag, 
  CreditCard, 
  Star, 
  MessageSquare,
  User,
  Home,
  LogOut,
  Settings
} from 'lucide-react';
import {
  Sheet,
  SheetContent
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type BuyerSidebarProps = {
  className?: string;
  inDrawer?: boolean;  // If the sidebar is already in a drawer
  isOpen?: boolean;    // Control drawer open state from parent
  onOpenChange?: (open: boolean) => void; // Callback for open state change
};

const BuyerSidebar: React.FC<BuyerSidebarProps> = ({ 
  className,
  inDrawer = false,
  isOpen,
  onOpenChange
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  
  // Determine if we use inner state or props for open state
  const open = isOpen !== undefined ? isOpen : innerOpen;
  const setOpen = onOpenChange || setInnerOpen;
  
  // Check if we're on a mobile device on component mount
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      await supabase.auth.signOut();
      toast.success('You have been signed out');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };
  
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/buyer/dashboard', 
      icon: User,
      current: location.pathname === '/buyer/dashboard'
    },
    { 
      name: 'Home', 
      href: '/buyer/home', 
      icon: Home,
      current: location.pathname === '/buyer/home'
    },
    { 
      name: 'My Orders', 
      href: '/buyer/orders', 
      icon: ShoppingBag,
      current: location.pathname.includes('/buyer/orders')
    },
    { 
      name: 'Messages', 
      href: '/buyer/messages', 
      icon: MessageSquare,
      current: location.pathname.includes('/buyer/messages')
    },
    { 
      name: 'Payments', 
      href: '/buyer/payments', 
      icon: CreditCard,
      current: location.pathname.includes('/buyer/payments')
    },
    { 
      name: 'Reviews', 
      href: '/buyer/reviews', 
      icon: Star,
      current: location.pathname.includes('/buyer/reviews')
    },
  ];

  // Navigation content component (shared between mobile and desktop)
  const NavigationContent = () => (
    <>
      {/* Header - Light styling from the screenshot */}
      <div className="p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Buyer Portal</h2>
        </div>
      </div>
      
      {/* Account section - now above the main navigation */}
      {isMobile && inDrawer && (
        <>
          <div className="px-4 py-2 mt-2">
            <h3 className="text-sm text-muted-foreground">Account</h3>
          </div>
          
          <nav className="px-2 mb-2">
            <ul>
              <li>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    location.pathname === '/profile'
                      ? "bg-blue-600 text-white" 
                      : "hover:bg-accent"
                  )}
                >
                  <User className="mr-3 flex-shrink-0 h-5 w-5" />
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
          
          <Separator className="my-2" />
        </>
      )}
      
      {/* Main Navigation Links */}
      <div className="px-4 py-2">
        <h3 className="text-sm text-muted-foreground">Navigation</h3>
      </div>
      <nav className="px-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                onClick={() => setOpen(false)} // Close sheet when clicking a link
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  item.current
                    ? "bg-blue-600 text-white" 
                    : "hover:bg-accent"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    item.current ? "text-white" : ""
                  )}
                />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign Out button and Theme toggle moved to the bottom */}
      {isMobile && inDrawer && (
        <div className="mt-auto">
          <div className="absolute bottom-0 left-0 right-0 bg-background">
            {/* Theme toggle */}
            <div className="px-4 py-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <ThemeToggle />
              </div>
            </div>
            
            {/* Sign out button */}
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={(e) => {
                  handleSignOut(e);
                  setOpen(false);
                }}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign out
              </Button>
            </div>
          </div>
          
          {/* Add padding at the bottom to prevent content from being hidden behind the fixed elements */}
          <div className="h-32"></div>
        </div>
      )}
    </>
  );

  // Desktop sidebar (always visible on md+ screens)
  const DesktopSidebar = () => (
    <div className={cn(
      "hidden md:block border-r w-64 flex-shrink-0 bg-background", 
      className
    )}>
      <div className="sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
        <NavigationContent />
      </div>
    </div>
  );

  // For mobile devices, we'll use the Sheet component with left side drawer
  const MobileSidebar = () => {
    // If we're already in a drawer (inDrawer=true), just render the content
    if (inDrawer) {
      return <NavigationContent />;
    };
    
    // Otherwise, wrap content in a Sheet
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="left" 
          className="w-[250px] sm:w-[300px] p-0 z-[50] bg-background border-r-0"
        >
          <NavigationContent />
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      {isMobile && !inDrawer && <MobileSidebar />}
      {!inDrawer && <DesktopSidebar />}
      {inDrawer && <NavigationContent />}
    </>
  );
};

export default BuyerSidebar;
