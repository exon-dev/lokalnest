import React from 'react';
import Layout from '@/components/layout/Layout';
import Hero from '@/components/home/Hero';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategorySection from '@/components/home/CategorySection';
import ProducerSpotlight from '@/components/home/ProducerSpotlight';
import Features from '@/components/home/Features';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

const categories = [
  {
    id: "1",
    name: "Textiles & Clothing",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2570&q=80",
    count: 42,
    slug: "textiles-clothing"
  },
  {
    id: "2",
    name: "Wooden Crafts",
    image: "https://images.unsplash.com/photo-1611486212557-88be5ff6f941?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80",
    count: 36,
    slug: "wooden-crafts"
  },
  {
    id: "3",
    name: "Pottery & Ceramics",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
    count: 28,
    slug: "pottery-ceramics"
  },
  {
    id: "4",
    name: "Jewelry & Accessories",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2564&q=80",
    count: 34,
    slug: "jewelry-accessories"
  },
  {
    id: "5",
    name: "Home Decor",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2558&q=80",
    count: 45,
    slug: "home-decor"
  },
  {
    id: "6",
    name: "Food & Beverages",
    image: "https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
    count: 24,
    slug: "food-beverages"
  }
];

const producers = [
  {
    id: "1",
    name: "Bahay Hablon",
    image: "https://images.unsplash.com/photo-1556760544-74068565f05c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2574&q=80",
    location: "Iloilo",
    description: "Traditional Filipino textile workshop specializing in handwoven fabrics using indigenous materials and techniques passed down through generations.",
    productCount: 15
  },
  {
    id: "2",
    name: "Kalinga Woodcraft",
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
    location: "Baguio",
    description: "Family-run woodworking studio creating handcrafted wooden kitchen items, furniture, and decorative pieces using sustainable local hardwoods.",
    productCount: 22
  },
  {
    id: "3",
    name: "Binhi Pottery",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2670&q=80",
    location: "Laguna",
    description: "Ceramic studio founded by local artists creating contemporary pottery inspired by Philippine cultural heritage and natural surroundings.",
    productCount: 18
  }
];

const Index = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4">
        <div className="flex justify-end mt-4">
          <Link to="/buyer/home">
          </Link>
        </div>
        
        <div className="animate-fade-in">
          <Hero />
          <FeaturedProducts 
            title="Featured Crafts" 
            subtitle="Discover our curated selection of handcrafted products from talented local artisans"
          />
          <CategorySection 
            title="Shop by Category"
            subtitle="Browse our diverse range of locally-crafted products"
            categories={categories}
          />
          {/* <ProducerSpotlight producers={producers} /> */}
          <Features />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
