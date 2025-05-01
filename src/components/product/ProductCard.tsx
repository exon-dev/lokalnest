import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/buyer/shopping/Cart';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  category: string;
  location: string;
  className?: string;
  salePrice?: number;
  promotion?: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  } | null;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  seller,
  category,
  location,
  className,
  salePrice,
  promotion,
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { addItem } = useCart();

  // Calculate the discounted price based on promotion if available
  const getDiscountedPrice = (): number => {
    // If there's a sale price already set, use that
    if (salePrice) return salePrice;
    
    // If there's a promotion, calculate the discount
    if (promotion) {
      if (promotion.discount_type === 'percentage') {
        const discountAmount = price * (promotion.discount_value / 100);
        return parseFloat((price - discountAmount).toFixed(2));
      } else { // fixed discount
        return Math.max(0, price - promotion.discount_value);
      }
    }
    
    // No discount
    return price;
  };

  const discountedPrice = getDiscountedPrice();
  const hasDiscount = discountedPrice < price;
  const discountPercentage = hasDiscount ? Math.round((1 - discountedPrice / price) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ id, name, price: discountedPrice, image, seller });
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast.success(`${name} added to wishlist!`);
  };

  return (
    <Link 
      to={`/product/${id}`}
      className={cn(
        "group relative flex flex-col bg-background dark:bg-card rounded-lg overflow-hidden transition-all duration-300",
        "border border-border hover:border-primary/20 hover:shadow-elevation-2",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        {!isImageLoaded && (
          <div className="absolute inset-0 loading-shimmer" />
        )}
        <img
          src={image}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isHovered ? "scale-105" : "scale-100",
            isImageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsImageLoaded(true)}
        />
        <div
          className={cn(
            "absolute top-3 right-3 opacity-0 transform translate-y-1",
            "transition-all duration-300 ease-out",
            isHovered ? "opacity-100 translate-y-0" : ""
          )}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-background dark:bg-card shadow-sm"
            onClick={handleWishlist}
            aria-label="Add to wishlist"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute top-3 left-3">
          <span className="inline-block bg-background/90 dark:bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-foreground">
            {category}
          </span>
        </div>
        
        {/* Discount badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-3">
            <span className="inline-block bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {discountPercentage}% OFF
            </span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col p-4">
        <div className="text-muted-foreground text-xs mb-1">{seller} • {location}</div>
        <h3 className="font-medium mb-1 line-clamp-1 text-foreground">{name}</h3>
        
        {/* Price display */}
        <div className="mb-3">
          {hasDiscount ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">₱{discountedPrice.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground line-through">₱{price.toFixed(2)}</span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-foreground">₱{price.toFixed(2)}</div>
          )}
        </div>
        
        <Button 
          className={cn(
            "mt-auto w-full transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-85"
          )}
          onClick={handleAddToCart}
          size="sm"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Link>
  );
};

export default ProductCard;
