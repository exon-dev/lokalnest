import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import BuyerSidebar from '@/components/buyer/BuyerSidebar';
import { Button } from '@/components/ui/button';
import { ShoppingBag, CreditCard, MessageSquare } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { Sheet, SheetContent } from "@/components/ui/sheet";

const BuyerDashboard = () => {
  const location = useLocation();
  const isRootDashboard = location.pathname === '/buyer/dashboard';
  // Use the shared mobile menu context for controlling the sidebar
  const { isOpen, setIsOpen } = useMobileMenu();

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Mobile Sheet sidebar - using the navbar's hamburger menu through context */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent 
            side="left" 
            className="w-[250px] sm:w-[300px] p-0 z-[100] bg-slate-900 text-white border-r-0 pt-0"
          >
            <BuyerSidebar 
              inDrawer={true} 
              isOpen={isOpen} 
              onOpenChange={setIsOpen} 
              className="bg-transparent"
            />
          </SheetContent>
        </Sheet>
        
        <div className="flex flex-col md:flex-row">
          {/* Only show regular sidebar on desktop */}
          <div className="hidden md:block">
            <BuyerSidebar />
          </div>
          
          <main className="flex-1 p-4 md:p-6">
            {isRootDashboard ? (
              <div className="space-y-6">
                <h1 className="text-2xl font-semibold">Your Dashboard</h1>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h2 className="font-semibold mb-4">Recent Orders</h2>
                    <p className="text-sm text-muted-foreground">View your recent orders and track their status.</p>
                    <Link to="/buyer/orders" className="text-blue-light text-sm mt-4 inline-block hover:underline">View All Orders →</Link>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h2 className="font-semibold mb-4">Payment Methods</h2>
                    <p className="text-sm text-muted-foreground">Manage your payment methods and view transaction history.</p>
                    <Link to="/buyer/payments" className="text-blue-light text-sm mt-4 inline-block hover:underline">Manage Payments →</Link>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h2 className="font-semibold mb-4">Support & Help</h2>
                    <p className="text-sm text-muted-foreground">Need help? Contact our support team or view FAQs.</p>
                    <Link to="/buyer/support" className="text-blue-light text-sm mt-4 inline-block hover:underline">Get Support →</Link>
                  </div>
                </div>
                
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <h2 className="text-xl font-medium mb-4">Discover Local Artisan Products</h2>
                  <p className="text-muted-foreground mb-6">
                    Browse our curated collection of handcrafted products from talented local artisans across the Philippines.
                  </p>
                  <Link to="/buyer/home">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Shop Now
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="font-semibold">Quick Payment</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      We support multiple payment methods including credit/debit cards and cash on delivery.
                    </p>
                    <Link to="/buyer/payments" className="text-blue-light text-sm hover:underline">Manage Payment Options →</Link>
                  </div>
                  
                  <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h2 className="font-semibold">Customer Support</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Our support team is available to assist you with any questions or issues.
                    </p>
                    <Link to="/buyer/support" className="text-blue-light text-sm hover:underline">Contact Support →</Link>
                  </div>
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default BuyerDashboard;
