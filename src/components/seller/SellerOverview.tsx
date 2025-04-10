
import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  Star, 
  Users,
  ArrowUpRight,
  ArrowDownRight
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
  ResponsiveContainer 
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { SellerStats } from './dashboard/types';
import { fetchSellerStats } from './dashboard/sellerStatsService';
import { fetchRevenueData } from './dashboard/revenueService';
import { fetchCategoryData } from './dashboard/categoryService';
import { fetchRecentOrders } from './dashboard/ordersService';
import StatsCard from './dashboard/StatsCard';
import CategoryChart from './dashboard/CategoryChart';
import RevenueChart from './dashboard/RevenueChart';
import RecentOrdersTable from './dashboard/RecentOrdersTable';

const SellerOverview = () => {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [stats, setStats] = useState<SellerStats>({
    sales: { 
      title: "Total Sales", 
      value: "₱0.00", 
      description: "Loading...", 
      trend: "neutral",
      icon: <DollarSign className="h-5 w-5 text-blue-500" /> 
    },
    orders: { 
      title: "Orders", 
      value: "0", 
      description: "Loading...",
      trend: "neutral", 
      icon: <ShoppingBag className="h-5 w-5 text-orange-500" /> 
    },
    rating: { 
      title: "Rating", 
      value: "0/5", 
      description: "No reviews yet", 
      trend: "neutral",
      icon: <Star className="h-5 w-5 text-yellow-500" /> 
    },
    customers: { 
      title: "Customers", 
      value: "0", 
      description: "Loading...",
      trend: "neutral", 
      icon: <Users className="h-5 w-5 text-green-500" /> 
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);

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
        
        // Fetch stats: total sales, order count, average rating, customer count
        const statsData = await fetchSellerStats(sellerId);
        setStats(statsData);
        
        // Fetch revenue data for chart
        const revenueData = await fetchRevenueData(sellerId);
        setRevenueData(revenueData);
        
        // Fetch category data for pie chart
        const categoryData = await fetchCategoryData(sellerId);
        setCategoryData(categoryData);
        
        // Fetch recent orders
        const recentOrders = await fetchRecentOrders(sellerId);
        setRecentOrders(recentOrders);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard {...stats.sales} />
        <StatsCard {...stats.orders} />
        <StatsCard {...stats.rating} />
        <StatsCard {...stats.customers} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <CategoryChart data={categoryData} />
      </div>

      {/* Recent Orders */}
      <RecentOrdersTable orders={recentOrders} />
    </div>
  );
};

export default SellerOverview;
