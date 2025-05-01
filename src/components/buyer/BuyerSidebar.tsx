import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  ShoppingBag, 
  CreditCard, 
  Star, 
  MessageSquare,
  User,
  Home
} from 'lucide-react';
import {
  Sheet,
  SheetContent
} from "@/components/ui/sheet";

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
    // { 
    //   name: 'Support', 
    //   href: '/buyer/support', 
    //   icon: MessageSquare,
    //   current: location.pathname.includes('/buyer/support')
    // },
  ];

  // Navigation content component (shared between mobile and desktop)
  const NavigationContent = () => (
    <>
      {/* Header - Different styling for drawer vs desktop */}
      <div className={cn(
        "border-b", 
        inDrawer 
          ? "px-4 py-2 border-slate-800 mt-0" 
          : "p-4 border-border"
      )}>
        <div>
          <h2 className={cn("text-xl font-semibold", inDrawer ? "text-white" : "text-foreground")}>
            Buyer Portal
          </h2>
          {!inDrawer && (
            <p className="text-sm text-muted-foreground mt-1">Manage your orders and account</p>
          )}
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className={cn("px-2", inDrawer ? "mt-1" : "mt-2")}>
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                onClick={() => setOpen(false)} // Close sheet when clicking a link
                className={cn(
                  "group flex items-center px-4 py-2 text-sm font-medium rounded-md",
                  item.current
                    ? inDrawer 
                      ? "bg-blue-600 text-white" 
                      : "bg-accent text-primary dark:bg-accent dark:text-primary-foreground"
                    : inDrawer
                      ? "text-white hover:bg-slate-800/70"
                      : "text-foreground hover:text-primary hover:bg-accent/50"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    item.current 
                      ? inDrawer ? "text-white" : "text-primary" 
                      : inDrawer ? "text-blue-400" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );

  // Desktop sidebar (always visible on md+ screens)
  const DesktopSidebar = () => (
    <div className={cn("hidden md:block border-r border-border w-64 flex-shrink-0 bg-background", className)}>
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
    }
    
    // Otherwise, wrap content in a Sheet
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0 z-[100] bg-slate-900 text-white">
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
