import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Producer {
  id: string;
  name: string;
  image: string;
  location: string;
  description: string;
  productCount: number;
}

interface ProducerSpotlightProps {
  producers: Producer[];
}

const ProducerSpotlight: React.FC<ProducerSpotlightProps> = ({ producers }) => {
  return (
    <section className="py-16 bg-background dark:bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Meet Our Artisans</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get to know the passionate craftspeople and creators behind our marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {producers.map((producer) => (
            <Link
              key={producer.id}
              to={`/artisan/${producer.id}`}
              className={cn(
                "group bg-card dark:bg-card text-card-foreground dark:text-card-foreground rounded-lg overflow-hidden border border-border",
                "hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-elevation-2 transition-all duration-300"
              )}
            >
              <div className="aspect-[3/2] overflow-hidden relative">
                <img
                  src={producer.image}
                  alt={producer.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <h3 className="text-white text-xl font-semibold">{producer.name}</h3>
                  <p className="text-white/80 text-sm">{producer.location}</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-muted-foreground line-clamp-2 mb-3">
                  {producer.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{producer.productCount} Products</span>
                  <span 
                    className={cn(
                      "text-primary flex items-center text-sm font-medium",
                      "group-hover:underline"
                    )}
                  >
                    View Profile
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild>
            <Link to="/artisans">
              View All Artisans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProducerSpotlight;
