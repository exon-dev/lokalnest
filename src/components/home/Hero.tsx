import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Star, Package, HeartHandshake } from 'lucide-react';

const Hero = () => {
  useEffect(() => {
    // Find and remove any overlays that might be auto-added
    const overlays = document.querySelectorAll('.lokalnest-intro-overlay, .hero-overlay, [class*="overlay"]');
    overlays.forEach(overlay => {
      if (overlay.classList.contains('bg-black') || 
          overlay.classList.contains('dark:bg-slate-900') || 
          overlay.classList.contains('dark:bg-background') || 
          overlay.classList.contains('from-black')) {
        // Skip our actual gradient overlay
        if (!overlay.closest('.relative.h-\\[90vh\\]')) {
          overlay.remove();
        }
      }
    });
    
    // Disable any potential scripts that might be creating these overlays
    const disableOverlayScripts = () => {
      // This will prevent theme previews from creating overlays
      window.localStorage.setItem('lokalnest-welcome-seen', 'true');
      window.localStorage.setItem('theme-preview-seen', 'true');
    };
    
    disableOverlayScripts();
  }, []);

  return (
    <section className="relative h-[90vh] max-h-[800px] min-h-[600px] w-full flex items-center z-0 overflow-visible">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6E59A5] via-[#9b87f5] to-[#fff] dark:from-[#1A1F2C] dark:to-[#6E59A5] transition-colors duration-700" />
      
      <div className="container mx-auto px-4 z-10 h-full">
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
                className="border-white text-white hover:bg-white/10"
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
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f"
                    alt="Handwoven Textiles"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">Traditional Textiles</h3>
                    <p className="text-sm text-gray-600">Handwoven by local artisans</p>
                  </div>
                </div>
              </div>
              <div className="transform rotate-6 -translate-x-4">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1611486212557-88be5ff6f941"
                    alt="Wooden Crafts"
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800">Wooden Crafts</h3>
                    <p className="text-sm text-gray-600">Expertly crafted woodwork</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -right-8 bottom-6 w-[90px] h-[90px] rounded-full bg-gradient-to-tr from-[#D6BCFA] via-[#9b87f5]/30 to-[#fff]/30 opacity-60 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
