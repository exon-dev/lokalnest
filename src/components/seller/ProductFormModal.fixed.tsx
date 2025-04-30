import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { XCircle, Upload, Plus, Trash2, Info, Loader2, TagIcon, PercentIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: any) => void;
  product?: any;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
}

// This type is for internal use only, not used with Supabase directly
interface ProductPromotion {
  product_id: string;
  promotion_id: string;
  created_at?: string;
}

// Define a type-safe wrapper around supabase for custom tables
const customTable = (tableName: string) => {
  return supabase.from(tableName as any);
};

const ProductFormModal: React.FC<ProductFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  product 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [] as string[],
    dimensions: '',
    weight: '',
    materials: '',
    shipping_info: '',
    tags: [] as string[],
    promotions: [] as string[]
  });
  
  const [currentTag, setCurrentTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load product data if editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        stock: product.stock?.toString() || '',
        images: product.image ? [product.image] : [],
        dimensions: product.dimensions || '',
        weight: product.weight || '',
        materials: product.materials || '',
        shipping_info: product.shipping_info || '',
        tags: product.tags || [],
        promotions: product.promotions || []
      });

      // If editing an existing product, fetch all its images
      if (product.id) {
        fetchProductImages(product.id);
        // Fetch product promotions if editing
        fetchProductPromotions(product.id);
      }
    }
    
    // Fetch categories from Supabase
    fetchCategories();
    // Fetch available promotions
    fetchPromotions();
  }, [product]);

  // Fetch available active promotions
  const fetchPromotions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('seller_id', session.user.id)
        .eq('is_active', true);
        
      if (error) throw error;
      
      setPromotions((data || []) as Promotion[]);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast.error('Failed to load promotions');
    }
  };

  // Fetch existing product-promotion associations
  const fetchProductPromotions = async (productId: string) => {
    try {
      // Use our custom table wrapper to avoid type errors
      const { data, error } = await customTable('product_promotions')
        .select('promotion_id')
        .eq('product_id', productId);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Handle the data with appropriate type assertion
        const promotionIds = data.map((item: any) => item.promotion_id).filter(Boolean);
          
        setFormData(prev => ({
          ...prev,
          promotions: promotionIds
        }));
      }
    } catch (error) {
      console.error('Error fetching product promotions:', error);
    }
  };

  const fetchProductImages = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const imageUrls = data.map(img => img.url);
        setFormData(prev => ({ ...prev, images: imageUrls }));
      }
    } catch (error) {
      console.error('Error fetching product images:', error);
      toast.error('Failed to load product images');
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
      toast.error('Failed to load categories');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      const uploadedUrls = await Promise.all(
        Array.from(files).map(async (file) => {
          return await uploadImage(file);
        })
      );
      
      // Filter out any null values (failed uploads)
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validUrls]
      }));
      
      toast.success(`Successfully uploaded ${validUrls.length} image(s)`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload one or more images');
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to upload images');
        return null;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleAddImage = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      const uploadedUrls = await Promise.all(
        Array.from(droppedFiles).map(async (file) => {
          // Check if file is an image
          if (!file.type.startsWith('image/')) {
            toast.error(`File "${file.name}" is not an image`);
            return null;
          }
          return await uploadImage(file);
        })
      );
      
      // Filter out any null values (failed uploads)
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validUrls]
      }));
      
      if (validUrls.length > 0) {
        toast.success(`Successfully uploaded ${validUrls.length} image(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload one or more images');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Parse numeric values
    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      image: formData.images[0] || '' // Use first image as main image
    };
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to save products');
        return;
      }
      
      if (product && product.id) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            category_id: productData.category,
            stock_quantity: productData.stock,
            shipping_info: productData.shipping_info,
            dimensions: productData.dimensions,
            weight: productData.weight,
            materials: productData.materials,
            tags: Array.isArray(productData.tags) ? productData.tags.join(',') : productData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
          
        if (error) throw error;
        
        // Handle product images update
        // First delete existing images
        if (productData.images.length > 0) {
          // Keep track of existing images that should remain
          const existingImageUrls = product.images || [];
          const newImageUrls = productData.images.filter(url => !existingImageUrls.includes(url));
          
          // Add new images
          if (newImageUrls.length > 0) {
            const imagesToInsert = newImageUrls.map((url, index) => ({
              product_id: product.id,
              url,
              is_primary: index === 0 && existingImageUrls.length === 0, // First new image is primary if no existing images
              alt_text: `${productData.name} image ${index + 1}`
            }));
            
            const { error: imageError } = await supabase
              .from('product_images')
              .insert(imagesToInsert);
              
            if (imageError) {
              console.error('Error adding product images:', imageError);
            }
          }
        }
        
        // Update product promotions
        // First remove all existing associations
        await customTable('product_promotions')
          .delete()
          .eq('product_id', product.id);
          
        // Then add new associations
        if (productData.promotions.length > 0) {
          const promotionsToInsert = productData.promotions.map(promotionId => ({
            product_id: product.id,
            promotion_id: promotionId,
            created_at: new Date().toISOString()
          }));
          
          const { error: promotionError } = await customTable('product_promotions')
            .insert(promotionsToInsert);
            
          if (promotionError) {
            console.error('Error adding product promotions:', promotionError);
          }
        }
        
        toast.success('Product updated successfully');
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            category_id: productData.category,
            stock_quantity: productData.stock,
            shipping_info: productData.shipping_info,
            dimensions: productData.dimensions,
            weight: productData.weight,
            materials: productData.materials,
            tags: Array.isArray(productData.tags) ? productData.tags.join(',') : productData.tags,
            seller_id: session.user.id,
          })
          .select();
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const productId = data[0].id;
          
          // Add product images
          if (formData.images.length > 0) {
            const imagesToInsert = formData.images.map((url, index) => ({
              product_id: productId,
              url,
              is_primary: index === 0, // First image is primary
              alt_text: `${productData.name} image ${index + 1}`
            }));
            
            const { error: imageError } = await supabase
              .from('product_images')
              .insert(imagesToInsert);
              
            if (imageError) {
              console.error('Error adding product images:', imageError);
            }
          }
          
          // Add product promotions
          if (productData.promotions.length > 0) {
            const promotionsToInsert = productData.promotions.map(promotionId => ({
              product_id: productId,
              promotion_id: promotionId,
              created_at: new Date().toISOString()
            }));
            
            const { error: promotionError } = await customTable('product_promotions')
              .insert(promotionsToInsert);
              
            if (promotionError) {
              console.error('Error adding product promotions:', promotionError);
            }
          }
        }
        
        toast.success('Product added successfully');
      }
      
      onSave(productData);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[675px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[675px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange(value, 'category')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your product..."
                rows={4}
              />
            </div>
          </div>
          
          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pricing & Inventory</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₱) <span className="text-red-500">*</span></Label>
                <Input
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="0"
                  type="number"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Product Images */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-muted-foreground">Product Images</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddImage}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Add Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
              />
            </div>
            
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {index === 0 && (
                      <Badge className="absolute top-2 left-2 bg-primary">Main</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-border rounded-md p-8 text-center"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="mt-2 text-sm text-muted-foreground">Uploading images...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag & drop product images or click "Add Image" button
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Promotions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Applied Promotions</h3>
            
            {promotions.length > 0 ? (
              <div className="border rounded-md p-4 space-y-3">
                {promotions.map((promotion) => (
                  <div key={promotion.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`promotion-${promotion.id}`} 
                      checked={formData.promotions.includes(promotion.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev, 
                            promotions: [...prev.promotions, promotion.id]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            promotions: prev.promotions.filter(id => id !== promotion.id)
                          }));
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`promotion-${promotion.id}`}
                      className="flex items-center cursor-pointer flex-1"
                    >
                      <div className="ml-2 space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{promotion.title}</span>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            {promotion.discount_type === 'percentage' ? (
                              <>
                                <PercentIcon className="h-3 w-3" />
                                {promotion.discount_value}% off
                              </>
                            ) : (
                              <>
                                <TagIcon className="h-3 w-3" />
                                ₱{promotion.discount_value} off
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {promotion.description}
                        </p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed rounded-md p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No active promotions available. Create promotions in the Promotions & Discounts section.
                </p>
              </div>
            )}
          </div>
          
          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Additional Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  name="dimensions"
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="e.g., 10 x 5 x 2 inches"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="e.g., 500g"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="materials">Materials Used</Label>
              <Input
                id="materials"
                name="materials"
                value={formData.materials}
                onChange={handleChange}
                placeholder="e.g., Cotton, Wood, Clay"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shipping_info">Shipping Info</Label>
              <Textarea
                id="shipping_info"
                name="shipping_info"
                value={formData.shipping_info}
                onChange={handleChange}
                placeholder="Special shipping instructions..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
            
            <div className="flex items-center space-x-2">
              <Input
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags..."
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddTag}
              >
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="py-1 px-3 gap-1"
                >
                  {tag}
                  <XCircle 
                    className="h-3.5 w-3.5 cursor-pointer hover:text-destructive" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
              {formData.tags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags added yet</p>
              )}
            </div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-md flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Fields marked with <span className="text-red-500">*</span> are required. Adding comprehensive product details helps customers find your products more easily.
            </p>
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{product ? 'Update Product' : 'Add Product'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormModal; 