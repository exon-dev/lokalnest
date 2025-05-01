import React from 'react';
import ProductCard from './ProductCard';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  category: string;
  location: string;
  sale_price?: number;
  promotion?: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null;
}

interface ProductGridProps {
  products: Product[];
  className?: string;
  columns?: number;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  className,
  columns = 4
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  };

  return (
    <div 
      className={cn(
        "grid gap-4 md:gap-6",
        gridCols[columns as keyof typeof gridCols],
        className
      )}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={product.price}
          image={product.image}
          seller={product.seller}
          category={product.category}
          location={product.location}
          salePrice={product.sale_price}
          promotion={product.promotion}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
