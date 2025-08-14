import Link from 'next/link';
import { Button } from '@heaven-dolls/ui';
import { TrendingUp, Shield, Heart } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-elegant-50">
      <div className="container py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Premium Quality Products
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Discover Your{' '}
                <span className="bg-brand-gradient bg-clip-text text-transparent">
                  Perfect Match
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-md">
                Elegant, sophisticated, and tastefully curated adult products for discerning customers who value quality and discretion.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-brand-gradient hover:opacity-90" asChild>
                <Link href="/products">
                  Explore Collection
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/trending">
                  Trending Now
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Discreet & Secure</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Premium Quality</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>Trending Products</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative h-96 lg:h-[500px] bg-gradient-to-br from-brand-100 to-elegant-100 rounded-3xl overflow-hidden">
              {/* Abstract geometric shapes for elegant visual */}
              <div className="absolute inset-0">
                <div className="absolute top-20 left-20 w-32 h-32 bg-brand-200 rounded-full opacity-60 blur-xl" />
                <div className="absolute bottom-20 right-20 w-40 h-40 bg-elegant-200 rounded-full opacity-50 blur-xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-gradient opacity-20 rounded-full blur-3xl" />
              </div>
              
              {/* Elegant overlay pattern */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
              
              {/* Centered content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-brand-gradient rounded-2xl opacity-80" />
                  <h3 className="text-2xl font-semibold text-elegant-800">
                    Premium Experience
                  </h3>
                  <p className="text-elegant-600 max-w-xs">
                    Carefully curated products for sophisticated tastes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#ec489950,transparent)]" />
      </div>
    </section>
  );
}