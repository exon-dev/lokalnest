import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProductWithSeller = {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  category: string;
  location: string;
};

// New types for detailed product view
export type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  rating: number | null;
  review_count: number | null;
  shipping_info: string | null;
  dimensions: string | null;
  weight: string | null;
  materials: string | null;
  tags: string[] | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    id: string;
    business_name: string;
    logo_url: string | null;
    location: string | null;
    rating: number | null;
    product_count: number;
  };
  images: {
    id: string;
    url: string;
    is_primary: boolean | null;
    alt_text: string | null;
  }[];
};

// New function to get product details by ID
export async function getProductById(id: string): Promise<ProductDetail | null> {
  try {
    // First fetch the product with its related data
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        sale_price,
        stock_quantity,
        rating,
        review_count,
        shipping_info,
        dimensions,
        weight,
        materials,
        tags,
        categories!inner(id, name, slug),
        seller_profiles!inner(
          id, 
          business_name, 
          logo_url, 
          location
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!product) return null;

    // Fetch product images
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, url, is_primary, alt_text')
      .eq('product_id', id)
      .order('is_primary', { ascending: false });

    if (imagesError) throw imagesError;

    // Get seller's product count
    const { count: productCount, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', product.seller_profiles.id);

    if (countError) throw countError;

    // Format the data to match our expected structure
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      sale_price: product.sale_price,
      stock_quantity: product.stock_quantity,
      rating: product.rating,
      review_count: product.review_count,
      shipping_info: product.shipping_info,
      dimensions: product.dimensions,
      weight: product.weight,
      materials: product.materials,
      tags: product.tags,
      category: {
        id: product.categories.id,
        name: product.categories.name,
        slug: product.categories.slug
      },
      seller: {
        id: product.seller_profiles.id,
        business_name: product.seller_profiles.business_name,
        logo_url: product.seller_profiles.logo_url,
        location: product.seller_profiles.location,
        rating: 4.9, // Placeholder until we implement seller ratings
        product_count: productCount || 0
      },
      images: images || []
    };
  } catch (error) {
    console.error('Error fetching product details:', error);
    toast.error('Failed to load product details');
    return null;
  }
}

export async function getFeaturedProducts(): Promise<ProductWithSeller[]> {
  try {
    // Fetch recent products with seller info - limit to only 6 products
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        is_available,
        stock_quantity,
        categories(name),
        seller_profiles(business_name, location),
        product_images(url, is_primary)
      `)
      .eq('is_available', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(6); // Changed from 8 to 6

    if (error) throw error;

    // Transform data to match the expected format
    const formattedProducts = (data || []).map(product => {
      // Find primary image or use first available
      const primaryImage = product.product_images.find(img => img.is_primary);
      const image = primaryImage 
        ? primaryImage.url 
        : (product.product_images.length > 0 ? product.product_images[0].url : '');

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: image,
        seller: product.seller_profiles.business_name,
        category: product.categories ? product.categories.name : 'Uncategorized',
        location: product.seller_profiles.location || 'Philippines'
      };
    });

    return formattedProducts;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    toast.error('Failed to load featured products');
    return [];
  }
}

export async function getAllProducts(filters: {
  searchQuery?: string;
  category?: string;
  location?: string;
  priceRange?: [number, number];
  sortBy?: string;
}): Promise<ProductWithSeller[]> {
  try {
    // Start building the query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        is_available,
        stock_quantity,
        categories(name),
        seller_profiles(business_name, location),
        product_images(url, is_primary)
      `)
      .eq('is_available', true)
      .gt('stock_quantity', 0);

    // Apply category filter
    if (filters.category && filters.category !== 'All Categories') {
      query = query.eq('categories.name', filters.category);
    }

    // Apply location filter
    if (filters.location && filters.location !== 'All Locations') {
      query = query.eq('seller_profiles.location', filters.location);
    }

    // Apply price range filter
    if (filters.priceRange) {
      query = query
        .gte('price', filters.priceRange[0])
        .lte('price', filters.priceRange[1]);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match the expected format
    let formattedProducts = (data || []).map(product => {
      // Find primary image or use first available
      const primaryImage = product.product_images.find(img => img.is_primary);
      const image = primaryImage 
        ? primaryImage.url 
        : (product.product_images.length > 0 ? product.product_images[0].url : '');

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: image,
        seller: product.seller_profiles.business_name,
        category: product.categories ? product.categories.name : 'Uncategorized',
        location: product.seller_profiles?.location || 'Philippines'
      };
    });

    // Apply search filter client-side
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      formattedProducts = formattedProducts.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.seller.toLowerCase().includes(query)
      );
    }

    // Sort products client-side
    if (filters.sortBy) {
      formattedProducts = formattedProducts.sort((a, b) => {
        switch(filters.sortBy) {
          case 'price-low-high':
            return a.price - b.price;
          case 'price-high-low':
            return b.price - a.price;
          case 'name-a-z':
            return a.name.localeCompare(b.name);
          case 'name-z-a':
            return b.name.localeCompare(a.name);
          default:
            return 0; // Keep original order for 'popular'
        }
      });
    }

    return formattedProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    toast.error('Failed to load products');
    return [];
  }
}