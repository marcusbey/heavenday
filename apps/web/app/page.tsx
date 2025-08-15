'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryShowcase } from '@/components/home/category-showcase';
import { FeaturesSection } from '@/components/home/features-section';
import { ProductCarousel } from '@/components/products/product-carousel';
import { useFeaturedProducts, useTrendingProducts } from '@/hooks/use-products';

export default function Home() {
  const { data: featuredData, isLoading: featuredLoading, error: featuredError } = useFeaturedProducts(8);
  const { data: trendingData, isLoading: trendingLoading, error: trendingError } = useTrendingProducts(8);

  const featuredProducts = featuredData?.data || [];
  const trendingProducts = trendingData?.data || [];
  
  // Show demo content if CMS is not available
  const showDemoContent = (!featuredProducts.length && !featuredLoading && featuredError) || 
                          (!trendingProducts.length && !trendingLoading && trendingError);

  return (
    <MainLayout>
      <div className="space-y-0">
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Products */}
        <section className="py-16 md:py-24">
          <div className="container">
            {showDemoContent ? (
              <div className="text-center space-y-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
                  <p className="text-muted-foreground mt-4">
                    Connect to Strapi CMS to see your automated product catalog
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-lg p-6 border">
                      <div className="h-48 bg-muted rounded-lg mb-4"></div>
                      <h3 className="font-semibold">Demo Product {i}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Trending products will appear here automatically
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ProductCarousel
                title="Featured Products"
                products={featuredProducts}
                isLoading={featuredLoading}
              />
            )}
          </div>
        </section>

        {/* Category Showcase */}
        <CategoryShowcase />

        {/* Trending Products */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container">
            <ProductCarousel
              title="Trending Now"
              products={trendingProducts}
              isLoading={trendingLoading}
            />
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />
      </div>
    </MainLayout>
  );
}