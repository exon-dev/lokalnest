import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  Star, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Define types for our data
interface RevenueData {
  name: string;
  value: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface StatData {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface RecentOrder {
  id: string;
  customer: string;
  product: string;
  amount: string;
  status: string;
  date: string;
}

const SellerOverview = () => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false); 
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState<StatData[]>([
    { 
      title: "Total Sales", 
      value: "₱0.00", 
      description: "Loading...", 
      trend: "neutral",
      icon: <DollarSign className="h-5 w-5 text-blue-500" /> 
    },
    { 
      title: "Orders", 
      value: "0", 
      description: "Loading...",
      trend: "neutral", 
      icon: <ShoppingBag className="h-5 w-5 text-orange-500" /> 
    },
    { 
      title: "Rating", 
      value: "0/5", 
      description: "No reviews yet", 
      trend: "neutral",
      icon: <Star className="h-5 w-5 text-yellow-500" /> 
    },
    { 
      title: "Customers", 
      value: "0", 
      description: "Loading...",
      trend: "neutral", 
      icon: <Users className="h-5 w-5 text-green-500" /> 
    }
  ]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Check verification status
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Check verification status in seller_verifications table
        const { data: verificationData, error: verificationError } = await supabase
          .from('seller_verifications')
          .select('status, created_at')
          .eq('seller_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (verificationError) throw verificationError;
        
        if (verificationData && verificationData.length > 0) {
          setVerificationStatus(verificationData[0].status);
          // Set isVerified based on the status being 'approved' or 'verified'
          setIsVerified(verificationData[0].status === 'approved' || verificationData[0].status === 'verified');
        } else {
          setVerificationStatus('not_submitted');
          setIsVerified(false);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerificationStatus();
  }, []);

  // Fetch seller dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          toast.error("You must be logged in to view this page");
          return;
        }
        
        const sellerId = session.session.user.id;
        
        // Check verification status from seller_verifications table
        const { data: verificationData, error: verificationError } = await supabase
          .from('seller_verifications')
          .select('status, created_at')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (verificationError) throw verificationError;
        
        if (verificationData && verificationData.length > 0) {
          setVerificationStatus(verificationData[0].status);
          // Set isVerified based on the status being 'approved' or 'verified'
          setIsVerified(verificationData[0].status === 'approved' || verificationData[0].status === 'verified');
        } else {
          setVerificationStatus('not_submitted');
          setIsVerified(false);
        }
        
        if (!isVerified) {
          // For unverified sellers, set empty data but still fetch category data for their products
          setStats([
            { 
              title: "Total Sales", 
              value: "₱0.00", 
              description: "No sales yet", 
              trend: "neutral",
              icon: <DollarSign className="h-5 w-5 text-blue-500" /> 
            },
            { 
              title: "Orders", 
              value: "0", 
              description: "No orders yet",
              trend: "neutral", 
              icon: <ShoppingBag className="h-5 w-5 text-orange-500" /> 
            },
            { 
              title: "Rating", 
              value: "0/5", 
              description: "No reviews yet", 
              trend: "neutral",
              icon: <Star className="h-5 w-5 text-yellow-500" /> 
            },
            { 
              title: "Customers", 
              value: "0", 
              description: "No customers yet",
              trend: "neutral", 
              icon: <Users className="h-5 w-5 text-green-500" /> 
            }
          ]);
          
          setRevenueData([
            { name: 'Jan', value: 0 },
            { name: 'Feb', value: 0 },
            { name: 'Mar', value: 0 },
            { name: 'Apr', value: 0 },
            { name: 'May', value: 0 },
            { name: 'Jun', value: 0 }
          ]);
          
          setRecentOrders([]);
          
          // Only fetch category data for their own products
          await fetchCategoryData(sellerId);
        } else {
          // For verified sellers, fetch all dashboard data
          await fetchStats(sellerId);
          await fetchRevenueData(sellerId);
          await fetchCategoryData(sellerId);
          await fetchRecentOrders(sellerId);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isVerified]);

  // Fetch stats (sales, orders, rating, customers)
  const fetchStats = async (sellerId: string) => {
    try {
      // Fetch total sales
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select(`
          total_price, 
          product_id, 
          products:product_id(seller_id)
        `)
        .eq('products.seller_id', sellerId);
      
      if (salesError) throw salesError;
      
      // Filter out any results where the product doesn't belong to this seller
      const validSalesData = salesData?.filter(item => item.products?.seller_id === sellerId) || [];
      
      const totalSales = validSalesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
      const formattedSales = `₱${totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      // Fetch order count
      const { data: orders, error: ordersError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          product_id, 
          products:product_id(seller_id)
        `)
        .eq('products.seller_id', sellerId);
      
      if (ordersError) throw ordersError;
      
      // Filter orders to ensure they belong to this seller
      const validOrders = orders?.filter(order => order.products?.seller_id === sellerId) || [];
      
      // Count unique order IDs
      const uniqueOrderIds = new Set(validOrders.map(order => order.order_id));
      const orderCount = uniqueOrderIds.size;
      
      // Fetch average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('reviews')
        .select(`
          rating, 
          product_id, 
          products:product_id(seller_id)
        `)
        .eq('products.seller_id', sellerId);
      
      if (ratingError) throw ratingError;
      
      // Filter reviews to ensure they're for this seller's products
      const validRatingData = ratingData?.filter(review => review.products?.seller_id === sellerId) || [];
      
      let avgRating = 0;
      let reviewCount = 0;
      
      if (validRatingData.length > 0) {
        const totalRating = validRatingData.reduce((sum, review) => sum + (review.rating || 0), 0);
        reviewCount = validRatingData.length;
        avgRating = totalRating / reviewCount;
      }
      
      // Fetch customer count
      const { data: customersData, error: customersError } = await supabase
        .from('seller_customers')
        .select('customer_id')
        .eq('seller_id', sellerId);
      
      if (customersError) throw customersError;
      
      const customerCount = customersData?.length || 0;
      
      // Get previous month data for trends
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoStr = oneMonthAgo.toISOString();
      
      // Previous month sales
      const { data: prevSalesData, error: prevSalesError } = await supabase
        .from('order_items')
        .select(`
          total_price, 
          product_id, 
          products:product_id(seller_id), 
          orders:order_id(created_at)
        `)
        .eq('products.seller_id', sellerId)
        .lt('orders.created_at', oneMonthAgoStr);
      
      if (prevSalesError) throw prevSalesError;
      
      // Filter previous sales data
      const validPrevSalesData = prevSalesData?.filter(item => item.products?.seller_id === sellerId) || [];
      
      const prevMonthSales = validPrevSalesData.reduce((sum, item) => sum + (item.total_price || 0), 0);
      
      // Calculate sales trend
      let salesTrend = 0;
      let salesTrendString = "No previous data for comparison";
      
      if (prevMonthSales > 0) {
        salesTrend = (totalSales - prevMonthSales) / prevMonthSales * 100;
        salesTrendString = `${salesTrend > 0 ? '↑' : '↓'} ${Math.abs(salesTrend).toFixed(0)}% from last month`;
      } else if (totalSales > 0) {
        salesTrendString = "First month of sales";
      }
      
      // Update stats state
      setStats([
        { 
          title: "Total Sales", 
          value: formattedSales, 
          description: salesTrendString, 
          trend: salesTrend >= 0 ? "up" : "down",
          icon: <DollarSign className="h-5 w-5 text-blue-500" /> 
        },
        { 
          title: "Orders", 
          value: orderCount.toString(), 
          description: orderCount > 0 ? "From all time" : "No orders yet",
          trend: "neutral", 
          icon: <ShoppingBag className="h-5 w-5 text-orange-500" /> 
        },
        { 
          title: "Rating", 
          value: `${avgRating.toFixed(1)}/5`, 
          description: reviewCount > 0 ? `Based on ${reviewCount} reviews` : "No reviews yet", 
          trend: "neutral",
          icon: <Star className="h-5 w-5 text-yellow-500" /> 
        },
        { 
          title: "Customers", 
          value: customerCount.toString(), 
          description: customerCount > 0 ? "Unique buyers" : "No customers yet",
          trend: "neutral", 
          icon: <Users className="h-5 w-5 text-green-500" /> 
        }
      ]);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error("Failed to load statistics");
    }
  };

  // Fetch revenue data for bar chart
  const fetchRevenueData = async (sellerId: string) => {
    try {
      // Since today is April 22, 2025, let's get the last 6 months (Nov 2024 to Apr 2025)
      const revenueByMonth: RevenueData[] = [
        { name: 'Nov', value: 0 },
        { name: 'Dec', value: 0 },
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 0 },
        { name: 'Mar', value: 0 },
        { name: 'Apr', value: 0 },
      ];
      
      // Get all order data in one query for the entire period
      const startDate = new Date(2024, 10, 1).toISOString(); // Nov 1, 2024
      const endDate = new Date(2025, 4, 30).toISOString();   // Apr 30, 2025
      
      const { data: allOrderData, error } = await supabase
        .from('order_items')
        .select(`
          total_price, 
          product_id, 
          products:product_id(seller_id), 
          orders:order_id(created_at)
        `)
        .eq('products.seller_id', sellerId)
        .gte('orders.created_at', startDate)
        .lt('orders.created_at', endDate);
      
      if (error) throw error;
      
      // Filter orders that belong to this seller
      const validOrderData = allOrderData?.filter(item => 
        item.products?.seller_id === sellerId && 
        item.orders?.created_at
      ) || [];
      
      console.log('Valid order data count:', validOrderData.length);
      
      // Process each order and assign to the correct month
      validOrderData.forEach(order => {
        const orderDate = new Date(order.orders.created_at);
        const monthName = orderDate.toLocaleString('default', { month: 'short' });
        const monthIndex = revenueByMonth.findIndex(item => item.name === monthName);
        
        if (monthIndex >= 0) {
          revenueByMonth[monthIndex].value += (order.total_price || 0);
          console.log(`Added ${order.total_price} to ${monthName}, new total: ${revenueByMonth[monthIndex].value}`);
        }
      });
      
      // Round values for display
      revenueByMonth.forEach(month => {
        month.value = Math.round(month.value);
      });
      
      console.log('Final revenue by month:', revenueByMonth);
      setRevenueData(revenueByMonth);
      
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error("Failed to load revenue chart data");
    }
  };

  // Fetch category data for pie chart
  const fetchCategoryData = async (sellerId: string) => {
    try {
      // Get all categories with products from this seller
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id, 
          category_id, 
          seller_id,
          categories:category_id(name)
        `)
        .eq('seller_id', sellerId);
      
      if (error) throw error;
      
      // Ensure we only count products by this seller
      const validProductsData = productsData?.filter(product => product.seller_id === sellerId) || [];
      
      // If no products, show empty chart
      if (validProductsData.length === 0) {
        setCategoryData([{ name: 'No Products', value: 1 }]);
        return;
      }
      
      // Count products by category
      const categoryCounts: { [key: string]: number } = {};
      
      validProductsData.forEach(product => {
        const categoryName = product.categories?.name || 'Uncategorized';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      // Convert to chart data format
      const categoryChartData: CategoryData[] = Object.entries(categoryCounts).map(([name, count]) => ({
        name,
        value: count
      }));
      
      setCategoryData(categoryChartData);
      
    } catch (error) {
      console.error('Error fetching category data:', error);
      toast.error("Failed to load category chart data");
    }
  };

  // Fetch recent orders
  const fetchRecentOrders = async (sellerId: string) => {
    try {
      console.log('Fetching recent orders for seller:', sellerId);
      
      // Get orders where this seller is the seller_id
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          buyer_id,
          status,
          total_amount,
          profiles:buyer_id(full_name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }
      
      console.log('Orders retrieved:', orders?.length || 0);
      
      if (!orders || orders.length === 0) {
        console.log('No orders found for seller');
        setRecentOrders([]);
        return;
      }
      
      // For each order, get a representative product to display
      const formattedOrders: RecentOrder[] = await Promise.all(
        orders.map(async (order) => {
          // Get first product for this order
          const { data: orderItems } = await supabase
            .from('order_items')
            .select(`
              product_id,
              quantity,
              unit_price,
              total_price,
              products:product_id(name)
            `)
            .eq('order_id', order.id)
            .limit(1);
          
          const orderDate = new Date(order.created_at);
          const product = orderItems && orderItems.length > 0 
            ? orderItems[0].products?.name || 'Unknown Product'
            : 'Unknown Product';
          
          const amount = order.total_amount 
            ? `₱${order.total_amount.toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`
            : '₱0.00';
          
          return {
            id: order.id || 'Unknown',
            customer: order.profiles?.full_name || 'Anonymous',
            product,
            amount,
            status: order.status || 'Processing',
            date: orderDate.toLocaleDateString('en-PH')
          };
        })
      );
      
      console.log('Formatted orders:', formattedOrders);
      setRecentOrders(formattedOrders);
      
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      toast.error("Failed to load recent orders");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Card */}
      {!isVerified && (
        <Card className="mb-6 border-2 border-amber-500">
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="mr-4">
                {verificationStatus === 'pending' ? (
                  <Clock className="h-10 w-10 text-amber-500" />
                ) : verificationStatus === 'rejected' ? (
                  <ShieldAlert className="h-10 w-10 text-red-500" />
                ) : (
                  <ShieldAlert className="h-10 w-10 text-blue-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  {verificationStatus === 'pending' 
                    ? 'Verification pending' 
                    : verificationStatus === 'rejected'
                      ? 'Verification rejected'
                      : 'Verification needed'}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {verificationStatus === 'pending' ? (
                    'Your DTI Certificate is under review. You will be notified once verified.'
                  ) : verificationStatus === 'rejected' ? (
                    'Your verification was rejected. Please submit new documents.'
                  ) : (
                    'To list products and start selling, you need to verify your seller account with a DTI Certificate.'
                  )}
                </p>
                <p className="text-sm text-amber-700 mb-4">
                  Until your account is verified, no sales data or orders will be displayed.
                </p>
                <Button
                  onClick={() => navigate('/seller-verification')}
                  variant={verificationStatus === 'pending' ? 'outline' : 'default'}
                  className={verificationStatus === 'rejected' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  {verificationStatus === 'pending' ? 'Check status' : 'Verify your account'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₱${value}`, 'Revenue']} />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
            <CardDescription>Distribution of products across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 10, bottom: 30, left: 10 }}>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="horizontal" 
                    align="center"
                    verticalAlign="bottom"
                    formatter={(value, entry, index) => (
                      <span className="dark:text-white text-gray-800" style={{ fontSize: "0.875rem", padding: "0 5px" }}>
                        {value} ({categoryData[index]?.value || 0} products)
                      </span>
                    )}
                  />
                  <Tooltip formatter={(value) => `${value} products`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest customer orders</CardDescription>
          </div>
          {isVerified && (
            <Button onClick={() => navigate('/seller/dashboard/orders')} variant="outline" size="sm">
              <ShoppingBag className="mr-2 h-4 w-4" />
              View All Orders
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{order.id.substring(0, 8)}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell>{order.amount}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found</p>
              {isVerified && (
                <Button onClick={() => navigate('/seller/dashboard/orders')} variant="outline" className="mt-4">
                  Go to Orders Page
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, description, icon, trend = 'neutral' }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="rounded-full p-2 bg-muted">
            {icon}
          </div>
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className={`text-xs mt-1 ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-muted-foreground'
          }`}>
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerOverview;