import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductGrid from '@/components/product/ProductGrid';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProducts, ProductWithSeller } from '@/services/productService';

const categories = [
  "All Categories",
  "Textiles & Clothing",
  "Wooden Crafts",
  "Pottery & Ceramics",
  "Jewelry & Accessories",
  "Home Decor",
  "Food & Beverages",
  "Art & Paintings",
  "Soaps & Cosmetics"
];

const locations = [
  "All Locations",
  "Iloilo",
  "Pampanga",
  "Batangas",
  "Davao",
  "Cebu",
  "Palawan",
  "Baguio",
  "Laguna"
];

const BuyerHome: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortBy, setSortBy] = useState('popular');
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await getAllProducts({
          searchQuery,
          category: selectedCategory,
          location: selectedLocation,
          priceRange,
          sortBy
        });
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedCategory, selectedLocation, priceRange, sortBy]);
  
  // Filter products based on search query client-side for immediate feedback
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery.length === 0 || 
                          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.seller.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-6 mt-6">
      {/* Search and filter section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products, sellers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popular</SelectItem>
                <SelectItem value="price-low-high">Price: Low to High</SelectItem>
                <SelectItem value="price-high-low">Price: High to Low</SelectItem>
                <SelectItem value="name-a-z">Name: A to Z</SelectItem>
                <SelectItem value="name-z-a">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                  <SheetDescription>
                    Narrow down products based on your preferences.
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-4 space-y-6">
                  {/* Category filter */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Location filter */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Seller Location</Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger id="location">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Price range filter */}
                  <div className="space-y-4">
                    <Label>Price Range</Label>
                    <Slider
                      defaultValue={[0, 5000]}
                      min={0}
                      max={5000}
                      step={100}
                      value={priceRange}
                      onValueChange={(value) => setPriceRange([value[0], value[1]] as [number, number])}
                    />
                    <div className="flex justify-between text-sm">
                      <span>₱{priceRange[0]}</span>
                      <span>₱{priceRange[1]}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <SheetClose asChild>
                      <Button>Apply Filters</Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Active filters display */}
      <div className="mb-6 flex flex-wrap gap-2">
        {selectedCategory !== 'All Categories' && (
          <div className="bg-secondary text-sm px-3 py-1 rounded-full flex items-center">
            {selectedCategory}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => setSelectedCategory('All Categories')}
            >
              ✕
            </Button>
          </div>
        )}
        {selectedLocation !== 'All Locations' && (
          <div className="bg-secondary text-sm px-3 py-1 rounded-full flex items-center">
            {selectedLocation}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => setSelectedLocation('All Locations')}
            >
              ✕
            </Button>
          </div>
        )}
        {(priceRange[0] > 0 || priceRange[1] < 5000) && (
          <div className="bg-secondary text-sm px-3 py-1 rounded-full flex items-center">
            ₱{priceRange[0]} - ₱{priceRange[1]}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => setPriceRange([0, 5000])}
            >
              ✕
            </Button>
          </div>
        )}
      </div>

      {/* Products display */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">
          {loading 
            ? "Loading products..." 
            : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'Product' : 'Products'} Found`
          }
        </h2>
        
        {loading ? (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid products={filteredProducts} columns={4} />
        )}
      </div>
    </div>
  );
};

export default BuyerHome;