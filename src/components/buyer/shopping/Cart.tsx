import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  seller: string;
  selected: boolean;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleItemSelection: (id: string) => void;
  toggleAllSelection: (selected: boolean) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  selectedItems: CartItem[];
  selectedItemsCount: number;
  selectedItemsTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = async (product: Omit<CartItem, 'quantity' | 'selected'>) => {
    try {
      const { data: productData, error } = await supabase
        .from('products')
        .select('stock_quantity, is_available, seller_id, name')
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

      if (!productData.seller_id) {
        console.error('Product has no seller_id:', product.id);
        toast.error('Cannot add product without seller information');
        return;
      }
      
      console.log(`Adding product ${product.id} with seller ID: ${productData.seller_id}`);
      
      setItems(currentItems => {
        const existingItemIndex = currentItems.findIndex(item => item.id === product.id);
        
        if (existingItemIndex > -1) {
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
          toast.success(`${product.name} added to your cart`);
          return [...currentItems, { 
            ...product, 
            quantity: 1,
            seller: productData.seller_id,
            selected: false
          }];
        }
      });

      setIsCartOpen(true);
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

  const toggleItemSelection = (id: string) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAllSelection = (selected: boolean) => {
    setItems(currentItems =>
      currentItems.map(item => ({ ...item, selected }))
    );
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

  const selectedItems = items.filter(item => item.selected);

  const selectedItemsCount = selectedItems.reduce((total, item) => total + item.quantity, 0);

  const selectedItemsTotal = selectedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    toggleItemSelection,
    toggleAllSelection,
    clearCart,
    totalItems,
    totalPrice,
    selectedItems,
    selectedItemsCount,
    selectedItemsTotal,
    isCartOpen,
    setIsCartOpen
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
