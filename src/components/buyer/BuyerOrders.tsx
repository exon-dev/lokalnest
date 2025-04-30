
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import OrderList from './orders/OrderList';
import { Order } from './orders/types';
import { getOrders } from '@/services/orderService';
import { toast } from 'sonner';

const BuyerOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const fetchedOrders = await getOrders();
        setOrders(fetchedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load your orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-semibold">My Orders</h2>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>
        {/* <Button size="sm">Contact Support</Button> */}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <OrderList orders={orders} loading={loading} />
        </TabsContent>
        
        <TabsContent value="processing">
          <OrderList orders={orders} filterStatus="processing" loading={loading} />
        </TabsContent>
        
        <TabsContent value="shipped">
          <OrderList orders={orders} filterStatus="shipped" loading={loading} />
        </TabsContent>
        
        <TabsContent value="delivered">
          <OrderList orders={orders} filterStatus="delivered" loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerOrders;
