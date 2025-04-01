
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  seller: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initial render
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Save to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = async (product: Omit<CartItem, 'quantity'>) => {
    try {
      // Check product availability in database
      const { data: productData, error } = await supabase
        .from('products')
        .select('stock_quantity, is_available')
        .eq('id', product.id)
        .single();
      
      if (error) {
        console.error('Error checking product availability:', error);
        toast.error('Unable to verify product availability');
        return;
      }
      
      if (!productData || !productData.is_available || productData.stock_quantity <= 0) {
        toast.error('This product is currently unavailable');
        return;
      }
      
      setItems(currentItems => {
        // Check if item already exists in cart
        const existingItemIndex = currentItems.findIndex(item => item.id === product.id);
        
        if (existingItemIndex > -1) {
          // If it exists, check if we can increase quantity
          const newItems = [...currentItems];
          const newQuantity = newItems[existingItemIndex].quantity + 1;
          
          if (productData && newQuantity > productData.stock_quantity) {
            toast.error(`Sorry, only ${productData.stock_quantity} items available`);
            return currentItems;
          }
          
          newItems[existingItemIndex].quantity = newQuantity;
          toast.success(`Added another ${product.name} to your cart`);
          return newItems;
        } else {
          // If it doesn't exist, add new item with quantity 1
          toast.success(`${product.name} added to your cart`);
          return [...currentItems, { ...product, quantity: 1 }];
        }
      });
    } catch (err) {
      console.error('Error adding item to cart:', err);
      toast.error('Failed to add item to cart');
    }
  };

  const removeItem = (id: string) => {
    setItems(currentItems => {
      const itemToRemove = currentItems.find(item => item.id === id);
      if (itemToRemove) {
        toast.success(`${itemToRemove.name} removed from your cart`);
      }
      return currentItems.filter(item => item.id !== id);
    });
  };

  const updateQuantity = async (id: string, quantity: number) => {
    try {
      // Verify quantity against inventory
      if (quantity <= 0) {
        removeItem(id);
        return;
      }
      
      const { data: productData, error } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error checking product stock:', error);
        toast.error('Unable to verify product availability');
        return;
      }
      
      if (productData && quantity > productData.stock_quantity) {
        toast.error(`Sorry, only ${productData.stock_quantity} items available`);
        setItems(currentItems => 
          currentItems.map(item => 
            item.id === id ? { ...item, quantity: productData.stock_quantity } : item
          )
        );
        return;
      }
      
      setItems(currentItems => 
        currentItems.map(item => 
          item.id === id ? { ...item, quantity } : item
        )
      );
    } catch (err) {
      console.error('Error updating cart quantity:', err);
      toast.error('Failed to update cart');
    }
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Cart has been cleared');
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const totalPrice = items.reduce(
    (total, item) => total + item.price * item.quantity, 
    0
  );

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
