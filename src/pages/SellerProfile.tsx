import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Facebook, 
  Instagram, 
  Star, 
  Loader2,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSellerProfile, getSellerProducts, SellerProfile as BaseSellerProfile } from '@/services/sellerService';
import BuyerMessaging from '@/components/buyer/messaging/BuyerMessaging';
import { supabase } from '@/integrations/supabase/client';

// Extend the SellerProfile type to include missing properties
interface SellerProfile extends BaseSellerProfile {
  contact_phone: string; // Must be required to match the base interface
  facebook?: string | null; // Optional to match the base interface
  instagram?: string | null; // Optional to match the base interface
  founding_year?: number | null; // Optional to match the base interface
}
import { toast } from 'sonner';

// Types for product data
type Product = {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  description?: string;
  stock_quantity: number;
  category: string;
  image: string;
};

const SellerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sellerRating, setSellerRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    async function loadSellerData() {
      if (!id) return;
      
      setLoading(true);
      try {
        const [sellerData, productsData] = await Promise.all([
          getSellerProfile(id),
          getSellerProducts(id)
        ]);
        
        if (sellerData) {
          setSeller(sellerData);
          // Fetch seller ratings once we have the seller data
          fetchSellerRating(id);
        } else {
          toast.error("Seller profile not found");
        }
        
        setProducts(productsData || []);
      } catch (error) {
        console.error("Error loading seller profile:", error);
        toast.error("Failed to load seller information");
      } finally {
        setLoading(false);
      }
    }
    
    loadSellerData();
    
    // Check if the user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    
    checkAuth();
  }, [id]);
  
  // Fetch the seller's average rating from reviews
  const fetchSellerRating = async (sellerId: string) => {
    try {
      // First get all products from this seller
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);
      
      if (productsError) throw productsError;
      if (!products || products.length === 0) return;
      
      const productIds = products.map(p => p.id);
      
      // Get reviews for these products
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .in('product_id', productIds);
        
      if (reviewsError) throw reviewsError;
      
      // Calculate average rating
      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        const avgRating = totalRating / reviews.length;
        setSellerRating(parseFloat(avgRating.toFixed(1)));
        setReviewCount(reviews.length);
      }
    } catch (error) {
      console.error('Error fetching seller rating:', error);
    }
  };
  
  const handleMessageSeller = () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to message this seller");
      return;
    }
    setIsMessagingOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 mt-16 flex justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
            <p className="text-muted-foreground">Loading seller profile...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!seller) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 mt-16">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Seller Not Found</h1>
            <p className="text-muted-foreground mb-4">The seller profile you're looking for doesn't exist.</p>
            <Link to="/">
              <Button>Return to Home</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Back button */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/buyer/home')} 
            variant="ghost" 
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors pl-2 pr-4"
          >
            <div className="bg-primary-foreground rounded-full p-1 mr-1 transition-transform group-hover:-translate-x-0.5">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </div>
            <span>Back to Marketplace</span>
          </Button>
        </div>

        {/* Profile header */}
        <div className="bg-white border rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <img 
                src={seller.logo_url || "https://images.unsplash.com/photo-1556760544-74068565f05c?auto=format&fit=crop&w=150&q=80"}
                alt={seller.business_name}
                className="w-24 h-24 object-cover rounded-full border"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-semibold">{seller.business_name}</h1>
                <Button 
                  onClick={handleMessageSeller} 
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message Seller
                </Button>
              </div>
              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{sellerRating ? `${sellerRating} • ${reviewCount} reviews` : 'No ratings yet'}</span>
                {seller.location && (
                  <>
                    <span className="mx-2">•</span>
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{seller.location}</span>
                  </>
                )}
              </div>
              
              <p className="mt-4 text-muted-foreground">
                {seller.description || "No description available."}
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {seller.contact_phone && (
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-primary mr-2" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{seller.contact_phone}</p>
                </div>
              </div>
            )}
            
            {seller.contact_email && (
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-primary mr-2" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{seller.contact_email}</p>
                </div>
              </div>
            )}
            
            {seller.website && (
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-primary mr-2" />
                <div>
                  <p className="text-sm font-medium">Website</p>
                  <a 
                    href={seller.website.startsWith('http') ? seller.website : `https://${seller.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-light hover:underline"
                  >
                    {seller.website}
                  </a>
                </div>
              </div>
            )}
            
            {seller.founding_year && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-primary mr-2" />
                <div>
                  <p className="text-sm font-medium">Established</p>
                  <p className="text-sm text-muted-foreground">{seller.founding_year}</p>
                </div>
              </div>
            )}
          </div>
          
          {(seller.facebook || seller.instagram) && (
            <div className="mt-6 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Follow us:</span>
              {seller.facebook && (
                <a 
                  href={seller.facebook.startsWith('http') ? seller.facebook : `https://${seller.facebook}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {seller.instagram && (
                <a 
                  href={seller.instagram.startsWith('http') ? seller.instagram : `https://${seller.instagram}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-pink-600 hover:text-pink-800"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
        
        {/* Product listings */}
        <h2 className="text-xl font-semibold mb-6">Products by {seller.business_name}</h2>
        
        {products.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground">This seller has no products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id}>
                <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-md">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image || "https://placehold.co/400x400/e2e8f0/a1a1aa?text=No+Image"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                    <div className="flex items-center justify-between">
                      {product.sale_price ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">₱{product.sale_price.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground line-through">₱{product.price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold">₱{product.price.toFixed(2)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Messaging Dialog */}
      {seller && (
        <BuyerMessaging
          seller={{
            id: seller.id,
            name: seller.business_name,
            avatar_url: seller.logo_url || undefined
          }}
          isOpen={isMessagingOpen}
          onClose={() => setIsMessagingOpen(false)}
        />
      )}
    </Layout>
  );
};

export default SellerProfilePage;