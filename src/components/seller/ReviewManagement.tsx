import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Star,
  MessageCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  product_id: string;
  product_name: string;
  buyer_id: string;
  buyer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  response?: string;
  responded_at?: string;
}

const ReviewManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [responseText, setResponseText] = useState<{[key: string]: string}>({});
  const [currentTab, setCurrentTab] = useState('all');
  
  useEffect(() => {
    fetchReviews();
  }, []);
  
  const fetchReviews = async () => {
    setLoading(true);
    try {
      // First get the current seller's ID
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('You must be logged in to view reviews');
        setLoading(false);
        return;
      }
      
      const sellerId = session.user.id;
      
      // Get all products belonging to this seller
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);
      
      if (productsError) {
        console.error('Error fetching seller products:', productsError);
        toast.error('Failed to load seller products');
        setLoading(false);
        return;
      }
      
      if (!products || products.length === 0) {
        // Seller has no products yet
        setReviews([]);
        setLoading(false);
        return;
      }
      
      // Extract product IDs
      const productIds = products.map(product => product.id);
      
      // Now get reviews only for these products
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          product_id,
          rating,
          comment,
          created_at,
          buyer_id,
          products:product_id(name),
          profiles:buyer_id(full_name)
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const formattedReviews = data?.map(review => ({
        id: review.id,
        product_id: review.product_id,
        product_name: review.products?.name || 'Unknown Product',
        buyer_id: review.buyer_id,
        buyer_name: review.profiles?.full_name || 'Anonymous',
        rating: review.rating,
        comment: review.comment,
        created_at: new Date(review.created_at).toLocaleDateString(),
      }));
      
      setReviews(formattedReviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText[reviewId]?.trim()) {
      toast.error('Please enter a response');
      return;
    }
    
    try {
      // In a real app, you would update a review_responses table or similar
      // This is a simplified example
      toast.success('Response submitted successfully');
      
      // Clear response text
      setResponseText(prev => ({
        ...prev,
        [reviewId]: ''
      }));
      
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    }
  };
  
  const handleResponseChange = (reviewId: string, text: string) => {
    setResponseText(prev => ({
      ...prev,
      [reviewId]: text
    }));
  };
  
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (currentTab === 'all') return matchesSearch;
    if (currentTab === 'positive') return matchesSearch && review.rating >= 4;
    if (currentTab === 'negative') return matchesSearch && review.rating < 3;
    return matchesSearch;
  });
  
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-[300px]"
              />
            </div>
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">All Reviews</TabsTrigger>
                <TabsTrigger value="positive">Positive</TabsTrigger>
                <TabsTrigger value="negative">Negative</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">Loading reviews...</div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reviews found. When customers review your products, they will appear here.
              </div>
            ) : (
              filteredReviews.map(review => (
                <Card key={review.id} className="overflow-hidden">
                  <div className="p-4 bg-muted/30 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <Badge variant={review.rating >= 4 ? "outline" : "destructive"} className="ml-2">
                          {review.rating} / 5
                        </Badge>
                      </div>
                      <h3 className="text-sm font-medium">{review.product_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        By {review.buyer_name} • {review.created_at}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm">{review.comment}</p>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-4 w-4" />
                        <h4 className="text-sm font-medium">Your Response</h4>
                      </div>
                      <Textarea
                        placeholder="Write your response to this review..."
                        className="mb-3"
                        value={responseText[review.id] || ''}
                        onChange={(e) => handleResponseChange(review.id, e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSubmitResponse(review.id)}
                        disabled={!responseText[review.id]?.trim()}
                      >
                        Send Response
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewManagement;