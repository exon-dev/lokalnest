import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Package2, Tag, Calendar, Layers, Info, PercentIcon, TagIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stock < 10) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
    }
  };

  // Helper function to get category name from different possible fields
  const getCategoryName = (): string => {
    if (product.categories?.name) {
      return product.categories.name;
    }
    if (product.category_name) {
      return product.category_name;
    }
    if (product.category) {
      return product.category;
    }
    return 'Uncategorized';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Product Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="aspect-square rounded-lg overflow-hidden border border-border">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Package2 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{getCategoryName()}</Badge>
                {getStatusBadge(product.stock)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center text-sm">
                <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">Price:</span>
                <span className="font-medium">₱{product.price?.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center text-sm">
                <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">Stock:</span>
                <span className="font-medium">{product.stock} units</span>
              </div>

              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">Created:</span>
                <span className="font-medium">{formatDate(product.created_at)}</span>
              </div>

              <div className="flex items-center text-sm">
                <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground mr-1">ID:</span>
                <span className="font-medium text-xs">{product.id}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-medium">Description</h3>
              <p className="text-sm text-muted-foreground">
                {product.description || 'No description provided.'}
              </p>
            </div>

            {/* Promotion Information */}
            {product.promotion && (
              <div className="space-y-2">
                <h3 className="font-medium">Active Promotion</h3>
                <div className="bg-secondary/50 rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{product.promotion.title}</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {product.promotion.discount_type === 'percentage' ? (
                        <>
                          <PercentIcon className="h-3 w-3" />
                          {product.promotion.discount_value}% off
                        </>
                      ) : (
                        <>
                          <TagIcon className="h-3 w-3" />
                          ₱{product.promotion.discount_value} off
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{product.promotion.description}</p>
                  {product.sale_price && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Original: </span>
                      <span className="line-through">₱{product.price?.toFixed(2)}</span>
                      <span className="text-muted-foreground ml-2">Promotional: </span>
                      <span className="font-medium text-primary">₱{product.sale_price?.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.tags && product.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
          {/* <Button 
            onClick={() => {
              onClose();
              // Additional action here if needed
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
