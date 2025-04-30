import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Search, 
  User, 
  Menu, 
  X,
  LogOut
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const [user, setUser] = useState<any>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

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
        
        // If account_type is not set, check if the user has a seller profile
        try {
          const { data: sellerProfile } = await supabase
            .from('seller_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();
          
          // If user has a seller profile, they are likely a seller
          if (sellerProfile) {
            setIsBuyer(false);
            console.log("User identified as seller from seller_profiles table");
          } else {
            // Default to buyer if no seller profile exists
            setIsBuyer(true);
            console.log("User defaulted to buyer (no seller profile found)");
          }
        } catch (error) {
          console.log("Error checking seller profile:", error);
          // If there's an error, default to showing the cart (assume buyer)
          setIsBuyer(true);
          console.log("User defaulted to buyer due to error");
        }
      } else {
        setUser(null);
        setIsSignedIn(false);
        setIsBuyer(false);
      }
    });

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      if (session) {
        setUser(session.user);
        setIsSignedIn(true);
        
        // We'll handle this in the same way as above but in a separate function
        checkIfUserIsBuyer(session);
      } else {
        setUser(null);
        setIsSignedIn(false);
        setIsBuyer(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to determine if user is a buyer
  const checkIfUserIsBuyer = async (session) => {
    // First, check user metadata for account type
    const accountType = session.user.user_metadata?.account_type;
    console.log("Account type from metadata in auth change:", accountType);
    
    // If account_type is explicitly set to 'seller', the user is not a buyer
    if (accountType && accountType.toLowerCase() === 'seller') {
      setIsBuyer(false);
      console.log("User identified as seller from metadata in auth change");
      return;
    }
    
    // If account_type is explicitly set to 'buyer', the user is a buyer
    if (accountType && accountType.toLowerCase() === 'buyer') {
      setIsBuyer(true);
      console.log("User identified as buyer from metadata in auth change");
      return;
    }
    
    // If account_type is not set, check if the user has a seller profile
    try {
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();
      
      // If user has a seller profile, they are likely a seller
      if (sellerProfile) {
        setIsBuyer(false);
        console.log("User identified as seller from seller_profiles table in auth change");
      } else {
        // Default to buyer if no seller profile exists
        setIsBuyer(true);
        console.log("User defaulted to buyer (no seller profile found) in auth change");
      }
    } catch (error) {
      console.log("Error checking seller profile in auth change:", error);
      // If there's an error, default to showing the cart (assume buyer)
      setIsBuyer(true);
      console.log("User defaulted to buyer due to error in auth change");
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setIsSignedIn(false);
      setIsBuyer(false);
      
      toast.success('Successfully signed out');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
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
          className="text-xl md:text-2xl font-medium tracking-tight"
        >
          <span className="text-gradient dark:text-white">LokalNest</span>
        </Link>

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
        <div className="flex items-center gap-2">
          {/* Search button (small screens) */}
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden" 
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          
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
              <DropdownMenuContent align="end">
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
                  <DropdownMenuItem onClick={() => navigate('/buyer/orders')}>
                    Orders
                  </DropdownMenuItem>
                )}
                {user?.user_metadata?.account_type === 'seller' && (
                  <DropdownMenuItem onClick={() => navigate('/seller/dashboard')}>
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
            <Link to="/auth" className="hidden md:block">
              <Button variant="default" size="sm" className="ml-4">
                Sign In
              </Button>
            </Link>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;