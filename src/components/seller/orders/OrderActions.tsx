import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Truck, ClipboardCheck, Tag, Package } from 'lucide-react';

interface OrderActionsProps {
  orderId: string;
  status: string;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
}

const OrderActions: React.FC<OrderActionsProps> = ({ orderId, status, onUpdateStatus }) => {
  // Check if the order status is cancelled
  const isCancelled = status === 'cancelled';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Only show status change options if the order is not cancelled */}
        {!isCancelled && (
          <>
            {status === 'processing' && (
              <DropdownMenuItem onClick={() => onUpdateStatus(orderId, 'shipped')}>
                <Truck className="mr-2 h-4 w-4" />
                Mark as Shipped
              </DropdownMenuItem>
            )}
            
            {status === 'shipped' && (
              <DropdownMenuItem onClick={() => onUpdateStatus(orderId, 'delivered')}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Mark as Delivered
              </DropdownMenuItem>
            )}
            
            {(status === 'processing' || status === 'shipped') && (
              <DropdownMenuItem onClick={() => onUpdateStatus(orderId, 'cancelled')}>
                <Tag className="mr-2 h-4 w-4" />
                Cancel Order
              </DropdownMenuItem>
            )}
          </>
        )}
        
        {/* Always show view order details */}
        <DropdownMenuItem>
          <Package className="mr-2 h-4 w-4" />
          View Order Details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrderActions;
