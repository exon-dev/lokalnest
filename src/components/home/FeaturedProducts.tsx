import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getFeaturedProducts, ProductWithSeller } from '@/services/productService';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FeaturedProductsProps {
  title: string;
  subtitle?: string;
  staticProducts?: ProductWithSeller[];
  viewAllLink?: string;
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  title,
  subtitle,
  staticProducts,
  viewAllLink = '/products',
}) => {
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [loading, setLoading] = useState(!staticProducts);
  const navigate = useNavigate();

  useEffect(() => {
    if (staticProducts) {
      setProducts(staticProducts);
      return;
    }

    const loadProducts = async () => {
      try {
        const fetchedProducts = await getFeaturedProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error loading featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [staticProducts]);

  const handleProductClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/auth');
  };
  
  const handleViewAllClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/auth');
  };

  return (
    <section id="featured-products" className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-3">{title}</h2>
            {subtitle && <p className="text-muted-foreground max-w-2xl">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <a href="#" onClick={handleViewAllClick} className="mt-4 md:mt-0">
              <Button variant="outline" className="group">
                View All
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <FeaturedProductCard 
                key={product.id}
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Custom ProductCard for featured products that redirects to auth page
interface FeaturedProductCardProps {
  product: ProductWithSeller;
  onClick: (e: React.MouseEvent) => void;
}

const FeaturedProductCard: React.FC<FeaturedProductCardProps> = ({ product, onClick }) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a 
      href="#" 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col bg-background dark:bg-card rounded-lg overflow-hidden transition-all duration-300",
        "border border-border hover:border-primary/20 hover:shadow-elevation-2"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        {!isImageLoaded && (
          <div className="absolute inset-0 loading-shimmer" />
        )}
        <img
          src={product.image}
          alt={product.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isHovered ? "scale-105" : "scale-100",
            isImageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsImageLoaded(true)}
        />
        <div className="absolute top-3 left-3">
          <span className="inline-block bg-background/90 dark:bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-foreground">
            {product.category}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col p-4">
        <div className="text-muted-foreground text-xs mb-1">{product.seller} • {product.location}</div>
        <h3 className="font-medium mb-1 line-clamp-1 text-foreground">{product.name}</h3>
        <div className="text-sm font-semibold mb-3 text-foreground">₱{product.price.toFixed(2)}</div>
        
        <Button 
          className={cn(
            "mt-auto w-full transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-85"
          )}
          size="sm"
          onClick={onClick} // Redirect to auth page
        >
          View Details
        </Button>
      </div>
    </a>
  );
};

export default FeaturedProducts;
