import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import SellerDashboard from './pages/SellerDashboard';
import ProductManagement from './components/seller/ProductManagement';
import OrderManagement from './components/seller/OrderManagement';
import PromotionManagement from './components/seller/PromotionManagement';
import CustomerManagement from './components/seller/CustomerManagement';
import SellerSettings from './components/seller/SellerSettings';
import LogisticsManagement from './components/seller/logistics/LogisticsManagement';
import InventoryManagement from './components/seller/InventoryManagementNew';
import ReviewManagement from './components/seller/ReviewManagement';
import BuyerDashboard from './pages/BuyerDashboard';
import Checkout from './pages/Checkout';
import BuyerHome from './pages/BuyerHome';
import BuyerOrders from './components/buyer/BuyerOrders';
import BuyerPayments from './components/buyer/BuyerPayments';
import BuyerReviews from './components/buyer/BuyerReviews';
import BuyerSupport from './components/buyer/BuyerSupport';
import BuyerMessages from './components/buyer/messaging/BuyerMessages';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import Auth from './pages/Auth';
import VerifyOTP from './pages/VerifyOTP';
import SellerVerification from './pages/SellerVerification';
import SellerVerificationManagement from './components/admin/SellerVerificationManagement';
import { CartProvider } from './components/buyer/shopping/Cart';
import AdminDashboard from './pages/AdminDashboard';
import { ThemeProvider } from './components/theme/ThemeProvider';
import Profile from './pages/Profile';
import InventoryManagementNew from './components/seller/InventoryManagementNew';
import SellerMessagesDashboard from './pages/SellerMessagesDashboard';
import { MobileMenuProvider } from './context/MobileMenuContext';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <MobileMenuProvider>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify" element={<VerifyOTP />} />
              <Route path="/seller-verification" element={<SellerVerification />} />
              
              {/* Seller Dashboard Routes */}
              <Route path="/seller">
                <Route index element={<Navigate to="/seller/dashboard" replace />} />
                <Route path="dashboard" element={<SellerDashboard />}>
                  <Route index element={<Navigate to="/seller/dashboard/overview" replace />} />
                  <Route path="overview" element={<div>Overview</div>} />
                  <Route path="products" element={<ProductManagement />} />
                  <Route path="inventory" element={<InventoryManagementNew />} />
                  <Route path="orders" element={<OrderManagement />} />
                  <Route path="messages" element={<SellerMessagesDashboard />} />
                  <Route path="customers" element={<CustomerManagement />} />
                  <Route path="promotions" element={<PromotionManagement />} />
                  <Route path="logistics" element={<LogisticsManagement />} />
                  <Route path="reviews" element={<ReviewManagement />} />
                  <Route path="settings" element={<SellerSettings />} />
                </Route>
              </Route>
              
              {/* Buyer Routes */}
              <Route path="/buyer" element={<BuyerDashboard />}>
                <Route index element={<Navigate to="/buyer/home" replace />} />
                <Route path="dashboard" element={<div>Dashboard</div>} />
                <Route path="home" element={<BuyerHome />} />
                <Route path="orders" element={<BuyerOrders />} />
                <Route path="payments" element={<BuyerPayments />} />
                <Route path="reviews" element={<BuyerReviews />} />
                <Route path="support" element={<BuyerSupport />} />
                <Route path="messages" element={<BuyerMessages />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<div>Admin Dashboard</div>} />
                <Route path="seller-verifications" element={<SellerVerificationManagement />} />
              </Route>
              
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/artisan/:id" element={<SellerProfile />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Add additional routes here */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </CartProvider>
      </MobileMenuProvider>
    </ThemeProvider>
  );
}

export default App;