import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SellerSidebar from '@/components/seller/SellerSidebar';
import SellerOverview from '@/components/seller/SellerOverview';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define seller user type
interface SellerUser {
  id: string;
  name: string;
  avatar?: string;
  verified: boolean; // Changed to non-optional
}

const SellerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SellerUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch current user data from auth and seller_profiles
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth', { state: { from: location } });
          return;
        }

        // Get seller profile for name and avatar info
        const { data: sellerProfile, error } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching seller profile:", error);
          toast.error("Failed to load your seller profile");
        }

        // Get user metadata
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        // Check verification status directly from seller_verifications table
        const { data: verificationData, error: verificationError } = await supabase
          .from('seller_verifications')
          .select('status')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (verificationError) {
          console.error("Error fetching verification status:", verificationError);
        }
        
        // Set verified status based on seller_verifications table
        const isVerified = verificationData && verificationData.length > 0 ? 
                          (verificationData[0].status === 'approved' || verificationData[0].status === 'verified') : 
                          false;

        // Set user data combining auth and profile data
        setUser({
          id: session.user.id,
          name: sellerProfile?.business_name || profile?.full_name || 'Seller Account',
          avatar: profile?.avatar_url || '',
          verified: isVerified // Use verification status from seller_verifications
        });

      } catch (error) {
        console.error("Error in fetchUserData:", error);
        toast.error("An error occurred while loading your profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [location, navigate]);

  // Redirect if loading or no user
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Get current active tab from path
  const getActiveTab = () => {
    const pathSegments = location.pathname.split('/');
    const path = pathSegments[pathSegments.length - 1];
    
    if (path === 'products') return 'products';
    if (path === 'orders') return 'orders';
    if (path === 'promotions') return 'promotions';
    if (path === 'inventory') return 'inventory';
    if (path === 'messages') return 'messages';
    if (path === 'customers') return 'customers';
    if (path === 'reviews') return 'reviews';
    if (path === 'settings') return 'settings';
    if (path === 'profile') return 'profile';
    if (path === 'overview') return 'overview';
    return 'overview';
  };

  // Handle tab change and navigation
  const handleTabChange = (value: string) => {
    // Only allow unverified sellers to access overview and settings/profile
    if (!user.verified && 
        value !== 'overview' && 
        value !== 'settings' && 
        value !== 'profile') {
      toast.error("Your seller account needs verification to access this feature");
      return;
    }
    
    navigate(`/seller/dashboard/${value}`);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Seller Dashboard</h1>
              <p className="text-muted-foreground">Manage your products, orders, and store</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="hidden lg:block lg:col-span-3">
              <SellerSidebar user={user} />
            </div>

            {/* Content Area */}
            <div className="col-span-1 lg:col-span-9">
              <Tabs value={getActiveTab()} className="w-full" onValueChange={handleTabChange}>
                <TabsList className="w-full mb-6 overflow-x-auto flex sm:grid sm:grid-cols-9">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger 
                    value="products" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Products {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="inventory" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Inventory {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="orders" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Orders {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="messages" 
                    className="flex-1"
                  >
                    Messages
                  </TabsTrigger>
                  <TabsTrigger 
                    value="customers" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Customers {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="promotions" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Promotions {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className={`flex-1 ${!user.verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!user.verified}
                  >
                    Reviews {!user.verified && <span className="ml-1 text-xs">🔒</span>}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <SellerOverview />
                </TabsContent>
                
                <TabsContent value="products">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="inventory">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="orders">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="customers">
                  <Outlet />
                </TabsContent>

                <TabsContent value="messages">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="promotions">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="reviews">
                  <Outlet />
                </TabsContent>

                <TabsContent value="settings">
                  <Outlet />
                </TabsContent>
                
                <TabsContent value="profile">
                  <Outlet />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SellerDashboard;
