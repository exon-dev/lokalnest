import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Heart,
  Share2,
  ChevronRight,
  Star,
  Truck,
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/buyer/shopping/Cart';
import { getProductById, ProductDetail as ProductDetailType } from '@/services/productService';

// Default delivery options for all products
const deliveryOptions = [
  { name: "Standard Delivery", value: "2-3 business days", fee: 80 },
  { name: "Express Delivery", value: "Next-day delivery", fee: 150 },
];

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [mainImage, setMainImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    async function loadProduct() {
      if (!id) {
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        const productData = await getProductById(id);
        if (!productData) {
          toast.error('Product not found');
          navigate('/');
          return;
        }
        
        setProduct(productData);
        
        // Set the main image to the primary image or the first image
        if (productData.images && productData.images.length > 0) {
          const primaryImage = productData.images.find(img => img.is_primary);
          setMainImage(primaryImage ? primaryImage.url : productData.images[0].url);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      image: product.images?.length ? product.images[0].url : '',
      seller: product.seller.business_name
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  const handleAddToWishlist = () => {
    if (!product) return;
    toast.success(`${product.name} added to wishlist!`);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const incrementQuantity = () => {
    if (!product) return;
    if (quantity < product.stock_quantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Show loading state while fetching the product
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 mt-16 flex justify-center items-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show message if product not found
  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 mt-16 flex justify-center items-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Extract details from shipping_info if available
  let productDetails = [
    { name: "Materials", value: product.materials || "Not specified" },
    { name: "Dimensions", value: product.dimensions || "Not specified" },
    { name: "Weight", value: product.weight || "Not specified" },
    { name: "Care", value: "Not specified" },
    { name: "Origin", value: product.seller.location || "Philippines" },
  ];

  if (product.shipping_info) {
    productDetails.push({ name: "Shipping Information", value: product.shipping_info || "none" });
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 mt-16 animate-fade-in">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link to={`/category/${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>

        {/* Product content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product images */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-square overflow-hidden bg-white rounded-lg border border-border">
              {isLoadingImages && (
                <div className="absolute inset-0 loading-shimmer" />
              )}
              <img 
                src={mainImage} 
                alt={product.name} 
                className={cn(
                  "w-full h-full object-contain",
                  isLoadingImages ? "opacity-0" : "opacity-100 transition-opacity duration-300"
                )}
                onLoad={() => setIsLoadingImages(false)}
              />
            </div>
            {/* Image thumbnails */}
            {product.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image) => (
                  <button
                    key={image.id}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-md border transition-all duration-200",
                      mainImage === image.url 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-border hover:border-gray-300"
                    )}
                    onClick={() => setMainImage(image.url)}
                  >
                    <img 
                      src={image.url} 
                      alt={image.alt_text || `${product.name} - Image`} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-6">
            <div>
              <Link 
                to={`/artisan/${product.seller.id}`}
                className="text-sm text-blue-light hover:underline inline-flex items-center gap-1"
              >
                {product.seller.business_name}
              </Link>
              <h1 className="text-3xl font-semibold mt-1">{product.name}</h1>
              <div className="flex items-center mt-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="ml-1 text-sm font-medium">{product.rating || 'No Rating'}</span>
                </div>
                <span className="mx-2 text-muted-foreground">•</span>
                <Link to="#reviews" className="text-sm text-muted-foreground hover:text-foreground">
                  {product.review_count || 0} reviews
                </Link>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {product.stock_quantity > 0 ? 'In stock' : 'Out of stock'}
                </span>
              </div>
            </div>

            <Separator />

            {/* Price */}
            <div>
              {product.sale_price ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">₱{product.sale_price.toFixed(2)}</span>
                  <span className="text-lg text-muted-foreground line-through">₱{product.price.toFixed(2)}</span>
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                    {Math.round((1 - product.sale_price / product.price) * 100)}% OFF
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-semibold">₱{product.price.toFixed(2)}</span>
              )}
            </div>

            {/* Promotion Banner */}
            {product.promotion && (
              <div className="mt-2 bg-secondary/50 rounded-md p-3 border border-secondary">
                <div className="flex items-center gap-2">
                  {product.promotion.discount_type === 'percentage' ? (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                      {product.promotion.discount_value}% OFF
                    </span>
                  ) : (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                      ₱{product.promotion.discount_value} OFF
                    </span>
                  )}
                  <span className="font-medium text-sm">{product.promotion.title}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{product.promotion.description}</p>
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground">{product.description || 'No description available.'}</p>

            {/* Add to cart section */}
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex items-center border border-border rounded-md mr-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="h-10 w-10 rounded-none rounded-l-md"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="h-10 w-16 flex items-center justify-center border-l border-r border-border">
                    {quantity}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock_quantity}
                    aria-label="Increase quantity"
                    className="h-10 w-10 rounded-none rounded-r-md"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.stock_quantity} available
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={handleAddToWishlist}
                    aria-label="Add to wishlist"
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={handleShare}
                    aria-label="Share product"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Seller info */}
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center">
                <img
                  src={product.seller.logo_url || 'https://images.unsplash.com/photo-1556760544-74068565f05c?auto=format&fit=crop&w=150&q=80'}
                  alt={product.seller.business_name}
                  className="h-12 w-12 rounded-full object-cover border border-border mr-3"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{product.seller.business_name}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 mr-1" />
                    <span>{product.seller.rating || '5.0'} • {product.seller.product_count} products</span>
                  </div>
                </div>
                <Link to={`/artisan/${product.seller.id}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* Delivery options */}
            {/* 
            <div>
              <h3 className="font-medium mb-3">Delivery Options</h3>
              <div className="space-y-2">
                {deliveryOptions.map((option, index) => (
                  <div key={index} className="flex items-start p-3 rounded-md border border-border">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {option.value} • ₱{option.fee.toFixed(2)} shipping fee
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            */}

            {/* Product details/specifications */}
            <div>
              <h3 className="font-medium mb-3">Product Details</h3>
              <div className="space-y-1">
                {productDetails.map((detail, index) => (
                  <div key={index} className="flex py-2 border-b border-border last:border-0">
                    <span className="w-1/3 text-muted-foreground">{detail.name}</span>
                    <span className="w-2/3">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags section */}
            {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="bg-secondary px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-blue-light hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to shopping
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
