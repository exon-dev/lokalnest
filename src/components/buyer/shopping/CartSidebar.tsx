import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from './Cart';

interface CartSidebarProps {
  children?: React.ReactNode;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ children }) => {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    removeItem, 
    updateQuantity, 
    toggleItemSelection, 
    toggleAllSelection,
    selectedItemsCount,
    selectedItemsTotal,
    isCartOpen, 
    setIsCartOpen 
  } = useCart();
  const navigate = useNavigate();
  
  const handleCheckout = () => {
    navigate('/checkout');
  };

  const allSelected = items.length > 0 && items.every(item => item.selected);
  const someSelected = selectedItemsCount > 0;

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {totalItems}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {totalItems === 0
              ? "Your cart is empty"
              : `You have ${totalItems} ${totalItems === 1 ? 'item' : 'items'} in your cart`
            }
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Your cart is empty</h3>
              <p className="text-muted-foreground mt-2">
                Looks like you haven't added any products to your cart yet.
              </p>
              <SheetClose asChild>
                <Button className="mt-6" onClick={() => setIsCartOpen(false)}>Continue Shopping</Button>
              </SheetClose>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center mb-2">
                <Checkbox 
                  id="select-all" 
                  className="mr-2"
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All Items
                </label>
                <div className="flex-1"></div>
                <span className="text-sm text-muted-foreground">
                  {selectedItemsCount} of {totalItems} selected
                </span>
              </div>

              {items.map((item) => (
                <div key={item.id} className="flex border-b pb-4">
                  <div className="flex items-center mr-2">
                    <Checkbox 
                      id={`item-${item.id}`}
                      checked={item.selected}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                  </div>
                  <div className="h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium line-clamp-1">{item.name}</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.seller}</p>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none rounded-l-md"
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <div className="px-3 py-1">
                          {item.quantity}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-none rounded-r-md"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-semibold">₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Items</span>
                <span>{selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{someSelected ? selectedItemsTotal.toLocaleString() : '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>₱{someSelected ? selectedItemsTotal.toLocaleString() : '0'}</span>
              </div>
            </div>
            
            <SheetFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <SheetClose asChild>
                <Button variant="outline" className="sm:flex-1" onClick={() => setIsCartOpen(false)}>
                  Continue Shopping
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button 
                  onClick={() => {
                    handleCheckout();
                    setIsCartOpen(false);
                  }} 
                  className="sm:flex-1"
                  disabled={!someSelected}
                >
                  Checkout Selected
                </Button>
              </SheetClose>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSidebar;
