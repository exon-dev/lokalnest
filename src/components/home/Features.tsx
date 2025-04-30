import React from 'react';
import { Paintbrush, Gem, ThumbsUp, HeartHandshake } from 'lucide-react';

const features = [
  {
    icon: <Paintbrush className="h-10 w-10 text-blue-light" />,
    title: 'Handcrafted Quality',
    description: 'Each item is carefully made by skilled artisans using traditional techniques and premium materials.',
  },
  {
    icon: <Gem className="h-10 w-10 text-blue-light" />,
    title: 'Unique Designs',
    description: 'Discover one-of-a-kind pieces that showcase cultural heritage and artistic creativity.',
  },
  {
    icon: <ThumbsUp className="h-10 w-10 text-blue-light" />,
    title: 'Ethical Production',
    description: 'Our artisans use sustainable practices and fair labor standards in creating their products.',
  },
  {
    icon: <HeartHandshake className="h-10 w-10 text-blue-light" />,
    title: 'Support Local',
    description: 'Your purchase directly supports local craftspeople and helps preserve traditional arts.',
  },
];

const Features = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Why Shop With Us</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            At LokalNest, we connect consumers directly with local artisans to support traditional crafts while bringing unique, handmade products to your home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center p-6 bg-card dark:bg-card text-card-foreground dark:text-card-foreground rounded-lg border border-border"
            >
              <div className="p-3 rounded-full bg-blue-light/10 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
