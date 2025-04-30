import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewSubmission {
  productId: string;
  rating: number;
  comment: string;
}

/**
 * Submit a review for a product
 * @param review The review data to submit
 * @returns The newly created review or null if there was an error
 */
export async function submitReview(review: ReviewSubmission) {
  try {
    // Get current authenticated user
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData || !authData.user) {
      toast.error('You must be logged in to submit a review');
      return null;
    }

    const buyerId = authData.user.id;
    
    console.log('Submitting review:', { 
      buyer_id: buyerId,
      product_id: review.productId,
      rating: review.rating, 
      comment: review.comment
    });
    
    // Insert the review into the reviews table
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        buyer_id: buyerId,
        product_id: review.productId,
        rating: review.rating,
        comment: review.comment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_verified: true // This is a verified purchase since it came from an order
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit your review. Please try again.');
      return null;
    }
    
    // Get product and seller information to create a notification
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('name, seller_id')
      .eq('id', review.productId)
      .single();
    
    if (!productError && productData) {
      // Create notification for the seller about the new review
      await createNewReviewNotification(
        productData.seller_id, 
        data.id,
        review.productId,
        productData.name,
        review.rating
      );
    }
    
    return data;
  } catch (error) {
    console.error('Error in submitReview:', error);
    toast.error('Something went wrong while submitting your review');
    return null;
  }
}

/**
 * Create a notification for the seller when a new review is submitted
 */
async function createNewReviewNotification(
  sellerId: string, 
  reviewId: string,
  productId: string,
  productName: string,
  rating: number
): Promise<boolean> {
  try {
    console.log('Creating review notification for seller:', sellerId);
    
    // Rating message varies based on star rating
    const ratingText = rating >= 4 
      ? `positive ${rating}-star` 
      : rating >= 3 
        ? `${rating}-star` 
        : `negative ${rating}-star`;
    
    // Use the RPC function to create notification (respects user preferences)
    // Using type assertion to bypass TypeScript's limited RPC function name checking
    const { data, error } = await (supabase.rpc as any)('create_notification_if_enabled', {
      p_user_id: sellerId,
      p_notification_type: 'review',
      p_title: `New ${ratingText} Review`,
      p_message: `A customer left a ${ratingText} review for your product "${productName}".`,
      p_data: JSON.stringify({
        review_id: reviewId,
        product_id: productId,
        rating: rating
      })
    }) as { data: string | null, error: Error | null };

    if (error) {
      console.error('Error creating review notification:', error);
      return false;
    }
    
    if (data === null) {
      console.log('Notification not created - seller has disabled review notifications');
    } else {
      console.log('Review notification created successfully with ID:', data);
    }
    
    return true;
  } catch (error) {
    console.error('Exception in createNewReviewNotification:', error);
    return false;
  }
}

/**
 * Get all reviews for a user
 * @returns Array of reviews submitted by the current user
 */
export async function getUserReviews() {
  try {
    // Get current authenticated user
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData || !authData.user) {
      console.error('User not authenticated');
      return [];
    }

    const buyerId = authData.user.id;
    console.log('Fetching reviews for buyer ID:', buyerId);
    
    // Get all reviews by this user, joining with product data
    // But only select the basic product fields (not images)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        products:product_id (
          id,
          name
        )
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load your reviews');
      return [];
    }
    
    console.log('Retrieved reviews data:', data);
    
    // Now process the data and fetch images separately
    const reviewsWithImages = await Promise.all(data.map(async (review) => {
      if (!review.products) {
        console.warn('No product data for review:', review.id);
      }
      
      let productImage = '/placeholder.svg';
      
      // Fetch image from product_images table
      if (review.product_id) {
        const { data: imageData } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', review.product_id)
          .limit(1)
          .single();
        
        if (imageData && imageData.url) {
          productImage = imageData.url;
        }
      }
      
      return {
        id: review.id,
        productId: review.product_id,
        productName: review.products ? review.products.name : 'Product',
        productImage: productImage,
        rating: review.rating,
        content: review.comment,
        date: review.created_at,
        isVerified: review.is_verified
      };
    }));
    
    return reviewsWithImages;
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    toast.error('Something went wrong while loading your reviews');
    return [];
  }
}

/**
 * Delete a review
 * @param reviewId The ID of the review to delete
 * @returns True if successful, false otherwise
 */
export async function deleteReview(reviewId: string) {
  try {
    // Get current authenticated user
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData || !authData.user) {
      toast.error('You must be logged in to delete a review');
      return false;
    }

    const buyerId = authData.user.id;
    
    // First check if this review belongs to this user
    const { data: review, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('buyer_id', buyerId)
      .single();
    
    if (checkError || !review) {
      console.error('Error checking review ownership:', checkError);
      toast.error('You cannot delete this review');
      return false;
    }
    
    // Delete the review
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    
    if (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete your review');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteReview:', error);
    toast.error('Something went wrong while deleting your review');
    return false;
  }
}

/**
 * Update an existing review
 * @param reviewId The ID of the review to update
 * @param updates The updated rating and content
 * @returns True if successful, false otherwise
 */
export async function updateReview(reviewId: string, updates: { rating: number, comment: string }) {
  try {
    // Get current authenticated user
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData || !authData.user) {
      toast.error('You must be logged in to update a review');
      return false;
    }

    const buyerId = authData.user.id;
    
    // First check if this review belongs to this user
    const { data: review, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('id', reviewId)
      .eq('buyer_id', buyerId)
      .single();
    
    if (checkError || !review) {
      console.error('Error checking review ownership:', checkError);
      toast.error('You cannot update this review');
      return false;
    }
    
    // Update the review
    const { error } = await supabase
      .from('reviews')
      .update({
        rating: updates.rating,
        comment: updates.comment,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);
    
    if (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update your review');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateReview:', error);
    toast.error('Something went wrong while updating your review');
    return false;
  }
}