import { Shield, Truck, Heart, Star, Lock, Award } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Discreet & Private',
    description: 'Your privacy is our priority with discreet packaging and secure transactions.',
  },
  {
    icon: Award,
    title: 'Premium Quality',
    description: 'Only the highest quality products from trusted brands and manufacturers.',
  },
  {
    icon: Truck,
    title: 'Fast & Secure Shipping',
    description: 'Quick, reliable delivery with tracking and insurance on all orders.',
  },
  {
    icon: Star,
    title: 'Expert Curation',
    description: 'Our team carefully selects each product for quality, safety, and satisfaction.',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'Multiple secure payment options with industry-leading encryption.',
  },
  {
    icon: Heart,
    title: 'Customer Satisfaction',
    description: '24/7 support and hassle-free returns for your complete satisfaction.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Heaven Dolls?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We&apos;re committed to providing an exceptional experience with every aspect of your journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 rounded-lg bg-background hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-brand-gradient flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}