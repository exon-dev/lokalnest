import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Star, Package, HeartHandshake } from 'lucide-react';

const Hero = () => {
  useEffect(() => {
    // Keep existing overlay removal code
    // ... keep existing code (overlay removal functionality)
  }, []);

  return (
    <section className="relative h-[90vh] max-h-[800px] min-h-[600px] w-full flex items-center z-0 overflow-hidden">
      {/* Background gradients - full width */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6E59A5] via-[#9b87f5] to-[#fff] dark:from-[#1A1F2C] dark:to-[#6E59A5] transition-colors duration-700" />
      
      {/* Content wrapper - full width but with internal padding */}
      <div className="w-full z-10 h-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center h-full">
            {/* Left Content */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm w-fit px-4 py-2 rounded-full">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">Supporting Local Artisans</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Discover Authentic
                <span className="block bg-gradient-to-r from-[#D6BCFA] via-[#9b87f5] to-[#6E59A5] bg-clip-text text-transparent">
                  Handcrafted Treasures
                </span>
              </h1>

              <p className="text-lg text-white/90 max-w-xl">
                Connect with skilled local artisans and explore unique, handmade products. 
                From traditional textiles to exquisite woodwork, find pieces that tell a story.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button 
                  size="lg" 
                  className="bg-white text-[#6E59A5] hover:bg-white/90 transition-all duration-300 group"
                >
                  <ShoppingBag className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  Shop Collection
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 dark:border-white dark:text-white dark:hover:bg-white/10 border-[#6E59A5] text-[#6E59A5] hover:bg-[#6E59A5]/10"
                >
                  <HeartHandshake className="mr-2 h-5 w-5" />
                  Meet Artisans
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="flex flex-col items-center text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <Package className="h-6 w-6 text-white mb-2" />
                  <span className="text-white text-sm">Handcrafted Quality</span>
                </div>
                <div className="flex flex-col items-center text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <HeartHandshake className="h-6 w-6 text-white mb-2" />
                  <span className="text-white text-sm">Support Local</span>
                </div>
                <div className="flex flex-col items-center text-center bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <Star className="h-6 w-6 text-white mb-2" />
                  <span className="text-white text-sm">Verified Artisans</span>
                </div>
              </div>
            </div>

            {/* Right Content - Product Showcase */}
            <div className="hidden lg:flex justify-center items-center relative">
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                {/* Featured Product Cards */}
                <div className="transform -rotate-6 translate-x-4 translate-y-8">
                  <div className="bg-card dark:bg-card rounded-lg shadow-xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f"
                      alt="Handwoven Textiles"
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-card-foreground dark:text-card-foreground">Traditional Textiles</h3>
                      <p className="text-sm text-muted-foreground">Handwoven by local artisans</p>
                    </div>
                  </div>
                </div>
                <div className="transform rotate-6 -translate-x-4">
                  <div className="bg-card dark:bg-card rounded-lg shadow-xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1611486212557-88be5ff6f941"
                      alt="Wooden Crafts"
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-card-foreground dark:text-card-foreground">Wooden Crafts</h3>
                      <p className="text-sm text-muted-foreground">Expertly crafted woodwork</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -right-8 bottom-6 w-[90px] h-[90px] rounded-full bg-gradient-to-tr from-[#D6BCFA] via-[#9b87f5]/30 to-[#fff]/30 opacity-60 blur-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional full-width decorative elements */}
      <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-bl from-[#D6BCFA]/30 via-[#9b87f5]/20 to-transparent rounded-full opacity-70 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[120px] h-[120px] bg-gradient-to-tr from-[#6E59A5]/40 to-transparent rounded-full opacity-60 blur-2xl"></div>
    </section>
  );
};

export default Hero;
