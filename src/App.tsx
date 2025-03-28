
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import SellerDashboard from "./pages/SellerDashboard";
import ProductManagement from "./components/seller/ProductManagement";
import OrderManagement from "./components/seller/OrderManagement";
import PromotionManagement from "./components/seller/PromotionManagement";
import InventoryManagement from "./components/seller/InventoryManagement";
import CustomerManagement from "./components/seller/CustomerManagement";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./components/admin/UserManagement";
import ProductOversight from "./components/admin/ProductOversight";
import BusinessIntelligence from "./components/admin/BusinessIntelligence";
import SecurityCompliance from "./components/admin/SecurityCompliance";
import Logistics from "./components/admin/Logistics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/category/:slug" element={<Index />} />
          <Route path="/artisan/:id" element={<Index />} />
          <Route path="/artisans" element={<Index />} />
          <Route path="/about" element={<Index />} />
          
          {/* Seller Routes */}
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/products" element={<SellerDashboard />}>
            <Route index element={<ProductManagement />} />
          </Route>
          <Route path="/seller/inventory" element={<SellerDashboard />}>
            <Route index element={<InventoryManagement />} />
          </Route>
          <Route path="/seller/orders" element={<SellerDashboard />}>
            <Route index element={<OrderManagement />} />
          </Route>
          <Route path="/seller/customers" element={<SellerDashboard />}>
            <Route index element={<CustomerManagement />} />
          </Route>
          <Route path="/seller/promotions" element={<SellerDashboard />}>
            <Route index element={<PromotionManagement />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminDashboard />}>
            <Route index element={<UserManagement />} />
          </Route>
          <Route path="/admin/products" element={<AdminDashboard />}>
            <Route index element={<ProductOversight />} />
          </Route>
          <Route path="/admin/analytics" element={<AdminDashboard />}>
            <Route index element={<BusinessIntelligence />} />
          </Route>
          <Route path="/admin/security" element={<AdminDashboard />}>
            <Route index element={<SecurityCompliance />} />
          </Route>
          <Route path="/admin/logistics" element={<AdminDashboard />}>
            <Route index element={<Logistics />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
