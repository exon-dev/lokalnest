import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Search, 
  User, 
  Menu, 
  X,
  LogOut,
  Home,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Star,
  BarChart2,
  Package,
  Boxes,
  Users,
  Tag,
  Settings
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from '@/lib/utils';
import CartSidebar from '@/components/buyer/shopping/CartSidebar';
import { useCart } from '@/components/buyer/shopping/Cart';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import NotificationsMenu from '@/components/notifications/NotificationsMenu';
import { useMobileMenu } from '@/context/MobileMenuContext';
import BuyerSidebar from '@/components/buyer/BuyerSidebar';

const categories = [
  { name: "Textiles & Clothing", href: "/category/textiles-clothing" },
  { name: "Wooden Crafts", href: "/category/wooden-crafts" },
  { name: "Pottery & Ceramics", href: "/category/pottery-ceramics" },
  { name: "Jewelry & Accessories", href: "/category/jewelry-accessories" },
  { name: "Home Decor", href: "/category/home-decor" },
  { name: "Food & Beverages", href: "/category/food-beverages" },
  { name: "Art & Paintings", href: "/category/art-paintings" },
  { name: "Soaps & Cosmetics", href: "/category/soaps-cosmetics" },
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { totalItems } = useCart();
  const [user, setUser] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Use our shared mobile menu context
  const { isOpen: mobileMenuOpen, toggle: toggleMobileMenu, setIsOpen: setMobileMenuOpen, drawerType, setDrawerType } = useMobileMenu();

  // Check if we're in a buyer route
  const isBuyerRoute = location.pathname.startsWith('/buyer');
  const isProductRoute = location.pathname.startsWith('/product');
  const isArtisanRoute = location.pathname.startsWith('/artisan');
  const shouldUseBuyerDrawer = isBuyerRoute || isProductRoute || isArtisanRoute;

  // Update drawer type when route changes
  useEffect(() => {
    if (shouldUseBuyerDrawer) {
      setDrawerType('buyer');
    } else {
      setDrawerType('main');
    }
  }, [location.pathname, shouldUseBuyerDrawer, setDrawerType]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setIsSignedIn(true);
        
        // Debug: Log user metadata
        console.log("User metadata:", session.user.user_metadata);
        
        // First, check user metadata for account type
        const accountType = session.user.user_metadata?.account_type;
        console.log("Account type from metadata:", accountType);
        
        // If account_type is explicitly set to 'seller', the user is not a buyer
        if (accountType && accountType.toLowerCase() === 'seller') {
          setIsBuyer(false);
          console.log("User identified as seller from metadata");
          return;
        }
        
        // If account_type is explicitly set to 'buyer', the user is a buyer
        if (accountType && accountType.toLowerCase() === 'buyer') {
          setIsBuyer(true);
          console.log("User identified as buyer from metadata");
          return;
        }
        
        // Otherwise, check seller_profiles table to determine if user is a seller
        try {
          const { data: sellerProfile, error } = await supabase
            .from('seller_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          // If we find a seller profile, user is NOT a buyer (they're a seller)
          if (sellerProfile && !error) {
            console.log("User identified as seller from database");
            setIsBuyer(false);
          } else {
            // Default: If no seller profile, assume the user is a buyer
            console.log("User identified as buyer (default)");
            setIsBuyer(true);
          }
        } catch (error) {
          console.error("Error checking seller profile:", error);
          // Default to buyer if there was an error
          setIsBuyer(true);
        }
      }
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setIsSignedIn(true);
          
          // Extract account type from user metadata
          const accountType = session.user.user_metadata?.account_type;
          if (accountType) {
            setIsBuyer(accountType.toLowerCase() === 'buyer');
          } else {
            // Default to buyer if no account type specified
            setIsBuyer(true);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsSignedIn(false);
          setIsBuyer(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out",
        isScrolled 
          ? "py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-subtle" 
          : "py-4 bg-transparent dark:bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xl md:text-2xl font-medium tracking-tight"
        >
          <img 
            src="/logo (1).svg" 
            alt="LokalNest Logo" 
            className="h-6 md:h-8"
          />
          <span className="text-gradient dark:text-white">LokalNest</span>
        </Link>

        {/* Desktop Navigation Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <NavigationMenu>
            <NavigationMenuList>
              {/* Commented out Categories menu
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium">
                  Categories
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-2 p-4 md:w-[500px] md:grid-cols-2">
                    {categories.map((category) => (
                      <li key={category.name}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={category.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {category.name}
                            </div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              */}
              {/* Commented out Artisans link
              <NavigationMenuItem>
                <Link to="/artisans" className="flex items-center gap-1 text-sm font-medium">
                  Artisans
                </Link>
              </NavigationMenuItem>
              */}
              {/* Commented out About link
              <NavigationMenuItem>
                <Link to="/about" className="flex items-center gap-1 text-sm font-medium">
                  About
                </Link>
              </NavigationMenuItem>
              */}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* User actions */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Shopping cart - show for buyers only (not on homepage or auth routes) */}
          {isBuyer && 
           location.pathname !== '/' && 
           !location.pathname.includes('/auth') && 
           !location.pathname.includes('/verify') && (
            <CartSidebar />
          )}
          
          {/* Theme toggle visible for desktop */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          
          {/* Notifications menu - only show for signed in users */}
          {isSignedIn && user && (
            <NotificationsMenu />
          )}
          
          {/* User dropdown or login button */}
          {isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
                    <AvatarFallback>
                      {getInitials(user?.user_metadata?.full_name || user?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Show Profile only for buyers, not for sellers */}
                {(isBuyer || user?.user_metadata?.account_type !== 'seller') && (
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                )}
                {/* Show Orders only for buyers or users who aren't explicitly sellers */}
                {(isBuyer || user?.user_metadata?.account_type !== 'seller') && (
                  <DropdownMenuItem onClick={() => navigate('/buyer/home')}>
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </DropdownMenuItem>
                )}
                {user?.user_metadata?.account_type === 'seller' && (
                  <DropdownMenuItem onClick={() => navigate('/seller/dashboard')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Seller Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {/* Theme toggle option */}
                <DropdownMenuItem className="md:hidden">
                  <div className="flex items-center justify-between w-full">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* Show sign in button on both mobile and desktop */}
              <Link to="/auth">
                <Button variant="default" size="sm" className="ml-4">
                  Sign In
                </Button>
              </Link>
            </>
          )}
          
          {/* Mobile menu button - hide on root route, auth routes, and verify routes */}
          {location.pathname !== '/' && !location.pathname.includes('/auth') && !location.pathname.includes('/verify') && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu Sheet - Only render when not on root route */}
      {location.pathname !== '/' && (
        <Sheet open={mobileMenuOpen} onOpenChange={setIsOpen => {
          if (!setIsOpen) toggleMobileMenu();
        }}>
          <SheetContent side="left" className="w-[80%] max-w-[300px] sm:max-w-sm p-0">
            {/* Conditional Drawer Content - Either Buyer Portal or Main Menu */}
            {drawerType === 'buyer' ? (
              <BuyerSidebar 
                inDrawer={true} 
                isOpen={mobileMenuOpen} 
                onOpenChange={setMobileMenuOpen} 
              />
            ) : (
              <div className="flex flex-col h-full">
                {/* Mobile menu header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <Link 
                      to="/" 
                      className="flex items-center gap-2 text-xl font-medium tracking-tight"
                      onClick={() => toggleMobileMenu()}
                    >
                      <img 
                        src="/logo (1).svg" 
                        alt="LokalNest Logo" 
                        className="h-6"
                      />
                      <span className="text-gradient dark:text-white">LokalNest</span>
                    </Link>
                  </div>
                </div>
              
                {/* Mobile menu content */}
                <div className="flex-1 overflow-auto py-2">
                  <div className="flex flex-col space-y-1">
                    {/* Show Home link for everyone except sellers */}
                    {user?.user_metadata?.account_type !== 'seller' && (
                      <Link 
                        to="/" 
                        className="flex items-center px-4 py-3 hover:bg-accent"
                        onClick={() => toggleMobileMenu()}
                      >
                        <Home className="mr-3 h-5 w-5" />
                        <span className="text-sm font-medium">Home</span>
                      </Link>
                    )}
                    
                    {/* Show Profile for signed in users who are not sellers */}
                    {isSignedIn && user && (
                      <>
                        {/* Profile link - only show for buyers or non-sellers */}
                        {(isBuyer || user?.user_metadata?.account_type !== 'seller') && (
                          <Link 
                            to="/profile" 
                            className="flex items-center px-4 py-3 hover:bg-accent"
                            onClick={() => toggleMobileMenu()}
                          >
                            <User className="mr-3 h-5 w-5" />
                            <span className="text-sm font-medium">Profile</span>
                          </Link>
                        )}
                        
                        {/* Show Orders for buyers */}
                        {(isBuyer || user?.user_metadata?.account_type !== 'seller') && (
                          <>
                            <Link 
                              to="/buyer/home" 
                              className="flex items-center px-4 py-3 hover:bg-accent"
                              onClick={() => toggleMobileMenu()}
                            >
                              <ShoppingBag className="mr-3 h-5 w-5" />
                              <span className="text-sm font-medium">My Orders</span>
                            </Link>
                            
                            <Link 
                              to="/messages" 
                              className="flex items-center px-4 py-3 hover:bg-accent"
                              onClick={() => toggleMobileMenu()}
                            >
                              <MessageSquare className="mr-3 h-5 w-5" />
                              <span className="text-sm font-medium">Messages</span>
                            </Link>
                            
                            <Link 
                              to="/payments" 
                              className="flex items-center px-4 py-3 hover:bg-accent"
                              onClick={() => toggleMobileMenu()}
                            >
                              <CreditCard className="mr-3 h-5 w-5" />
                              <span className="text-sm font-medium">Payments</span>
                            </Link>
                            
                            <Link 
                              to="/reviews" 
                              className="flex items-center px-4 py-3 hover:bg-accent"
                              onClick={() => toggleMobileMenu()}
                            >
                              <Star className="mr-3 h-5 w-5" />
                              <span className="text-sm font-medium">Reviews</span>
                            </Link>
                          </>
                        )}
                      </>
                    )}
                    
                    {/* Categories section - replace with Seller Dashboard navigation for sellers */}
                    <div className="px-4 py-2 mt-2">
                      {user?.user_metadata?.account_type === 'seller' ? (
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Seller Dashboard</h3>
                      ) : (
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
                      )}
                    </div>
                    
                    {user?.user_metadata?.account_type === 'seller' ? (
                      <div className="flex flex-col space-y-1">
                        <Link 
                          to="/seller/dashboard/overview" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <BarChart2 className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Overview</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/products" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Package className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Products</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/inventory" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Boxes className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Inventory</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/orders" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <ShoppingCart className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Orders</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/messages" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <MessageSquare className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Messages</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/customers" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Users className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Customers</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/promotions" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Tag className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Promotions</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/reviews" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Star className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Reviews</span>
                        </Link>
                        <Link 
                          to="/seller/dashboard/settings" 
                          className="flex items-center px-4 py-3 hover:bg-accent"
                          onClick={() => toggleMobileMenu()}
                        >
                          <Settings className="mr-3 h-5 w-5" />
                          <span className="text-sm font-medium">Settings</span>
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-1">
                        {categories.map((category) => (
                          <Link 
                            key={category.name}
                            to={category.href} 
                            className="flex items-center px-4 py-3 hover:bg-accent"
                            onClick={() => toggleMobileMenu()}
                          >
                            <span className="text-sm font-medium">{category.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile menu footer */}
                <div className="border-t p-4">
                  {isSignedIn ? (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={(e) => {
                        handleSignOut(e);
                        toggleMobileMenu();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  ) : (
                    <Link to="/auth" className="w-full" onClick={() => toggleMobileMenu()}>
                      <Button variant="default" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  )}
                  
                  {/* Theme toggle for mobile */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
};

export default Navbar;