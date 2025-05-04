import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import ProductFormModal from './ProductFormModal';
import ProductDetailModal from './ProductDetailModal';
import ProductTable from './ProductTable';
import ProductToolbar from './ProductToolbar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

// Define product interface
interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  categories?: {
    name: string;
  };
  category_name?: string;
  stock: number;
  status: string;
  description?: string;
  created_at?: string;
}

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  
  // Filter states
  const [filterPrice, setFilterPrice] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [filterStock, setFilterStock] = useState<string>('all'); 
  const [filterCategory, setFilterCategory] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    checkVerificationStatus();
    fetchCategories();
  }, []);
  
  useEffect(() => {
    if (isVerified) {
      fetchProducts();
    }
  }, [isVerified]);

  const checkVerificationStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to view your products');
        navigate('/auth');
        return;
      }
      
      // Check verification status directly from seller_verifications table
      const { data: verificationData, error: verificationError } = await supabase
        .from('seller_verifications')
        .select('status')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (verificationError) throw verificationError;
      
      if (verificationData && verificationData.length > 0) {
        // Set verification status and isVerified based on status in seller_verifications
        setVerificationStatus(verificationData[0].status);
        setIsVerified(verificationData[0].status === 'approved' || verificationData[0].status === 'verified');
      } else {
        setVerificationStatus('not_submitted');
        setIsVerified(false);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      toast.error('Failed to check seller verification status');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
        
      if (error) throw error;
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to view your products');
        navigate('/auth');
        return;
      }
      
      // Fetch products with category names
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          stock_quantity,
          created_at,
          category_id,
          categories(name)
        `)
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch product images
      const productsWithImages = await Promise.all(
        (data || []).map(async (product) => {
          const { data: images } = await supabase
            .from('product_images')
            .select('url')
            .eq('product_id', product.id)
            .eq('is_primary', true)
            .limit(1);
          
          return {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            image: images && images.length > 0 ? images[0].url : undefined,
            category: product.category_id,
            categories: product.categories,
            stock: product.stock_quantity,
            status: product.stock_quantity > 0 
              ? (product.stock_quantity < 10 ? 'low_stock' : 'active') 
              : 'out_of_stock',
            created_at: product.created_at
          };
        })
      );
      
      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const applyFilters = (product: Product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesPrice = 
      (filterPrice.min === '' || product.price >= parseFloat(filterPrice.min)) &&
      (filterPrice.max === '' || product.price <= parseFloat(filterPrice.max));
    
    let matchesStock = true;
    if (filterStock === 'in_stock') {
      matchesStock = product.stock > 0;
    } else if (filterStock === 'low_stock') {
      matchesStock = product.stock > 0 && product.stock < 10;
    } else if (filterStock === 'out_of_stock') {
      matchesStock = product.stock === 0;
    }
    
    // Improve category matching to handle all possible ways a category might be represented
    let matchesCategory = filterCategory === '';
    if (filterCategory !== '') {
      if (product.category === filterCategory) {
        matchesCategory = true;
      } else if (product.categories?.name && categories.find(cat => cat.id === filterCategory)?.name === product.categories.name) {
        matchesCategory = true;
      } else if (product.category_name && categories.find(cat => cat.id === filterCategory)?.name === product.category_name) {
        matchesCategory = true;
      }
    }
    
    return matchesSearch && matchesPrice && matchesStock && matchesCategory;
  };

  const filteredProducts = products.filter(applyFilters);

  const handleAddProduct = () => {
    if (!isVerified) {
      toast.error('Your seller account must be verified before you can list products');
      return;
    }
    
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    if (!isVerified) {
      toast.error('Your seller account must be verified before you can edit products');
      return;
    }
    
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isVerified) {
      toast.error('Your seller account must be verified before you can delete products');
      return;
    }
    
    try {
      // First check if the product has order items
      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id, order_id')
        .eq('product_id', productId);
      
      if (orderItems && orderItems.length > 0) {
        // Check if these are orphaned order items (orders are already deleted)
        const orderIds = [...new Set(orderItems.map(item => item.order_id))];
        
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .in('id', orderIds);
        
        if (existingOrders && existingOrders.length > 0) {
          // Orders still exist, cannot delete
          toast.error('Cannot delete product because it has orders. Consider setting it as unavailable instead.');
          return;
        } else {
          // Orders are gone but order_items still exist - these are orphaned records
          // Delete the orphaned order items
          const { error: deleteItemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('product_id', productId);
          
          if (deleteItemsError) {
            console.error('Error deleting orphaned order items:', deleteItemsError);
            toast.error('Failed to delete product - could not clean up order records');
            return;
          }
        }
      }
      
      // Delete related product images
      const { error: imageDeleteError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
      
      if (imageDeleteError) {
        console.error('Error deleting product images:', imageDeleteError);
        throw imageDeleteError;
      }
      
      // Finally delete the product itself
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
        
      if (error) throw error;
      
      // Update local state
      setProducts(products.filter(product => product.id !== productId));
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDuplicateProduct = (product: any) => {
    if (!isVerified) {
      toast.error('Your seller account must be verified before you can duplicate products');
      return;
    }
    
    const newProduct = {
      ...product,
      name: `${product.name} (Copy)`,
      id: undefined
    };
    
    setEditingProduct(newProduct);
    setIsModalOpen(true);
  };

  const handleSaveProduct = () => {
    fetchProducts(); // Refresh products from the database
    setIsModalOpen(false);
  };

  const resetFilters = () => {
    setFilterPrice({ min: '', max: '' });
    setFilterStock('all');
    setFilterCategory('');
    setIsFilterOpen(false);
  };
  
  const goToVerification = () => {
    navigate('/seller-verification');
  };

  // Show verification status message if not verified
  if (!isVerified) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <ShieldAlert className="w-16 h-16 text-amber-500" />
              <h2 className="text-xl font-semibold text-center">Seller Verification Required</h2>
              
              {verificationStatus === 'pending' ? (
                <>
                  <p className="text-center max-w-md text-muted-foreground">
                    Your verification is pending review by our admin team. You will be able to list products once your account is verified.
                  </p>
                  <Button onClick={() => navigate('/seller/dashboard')} variant="outline">
                    Go to Dashboard
                  </Button>
                </>
              ) : verificationStatus === 'rejected' ? (
                <>
                  <p className="text-center max-w-md text-muted-foreground">
                    Your verification was rejected. Please submit new verification documents.
                  </p>
                  <Button onClick={goToVerification}>
                    Submit Verification
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-center max-w-md text-muted-foreground">
                    To protect our customers, you must verify your seller account by uploading your DTI Certificate before you can list products.
                  </p>
                  <Button onClick={goToVerification}>
                    Verify Your Account
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <ProductToolbar
            searchTerm={searchTerm}
            handleSearch={handleSearch}
            handleAddProduct={handleAddProduct}
            isFilterOpen={isFilterOpen}
            toggleFilter={toggleFilter}
            filterPrice={filterPrice}
            setFilterPrice={setFilterPrice}
            filterStock={filterStock}
            setFilterStock={setFilterStock}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            categories={categories}
            resetFilters={resetFilters}
          />

          <ProductTable 
            products={products}
            loading={loading}
            filteredProducts={filteredProducts}
            handleEditProduct={handleEditProduct}
            handleViewProduct={handleViewProduct}
            handleDeleteProduct={handleDeleteProduct}
            handleDuplicateProduct={handleDuplicateProduct}
          />
        </CardContent>
      </Card>

      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          product={editingProduct}
        />
      )}

      {isViewModalOpen && viewingProduct && (
        <ProductDetailModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          product={viewingProduct}
        />
      )}
    </div>
  );
};

export default ProductManagement;