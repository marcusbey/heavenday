'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryShowcase } from '@/components/home/category-showcase';
import { FeaturesSection } from '@/components/home/features-section';
import { ProductCarousel } from '@/components/products/product-carousel';
import { useFeaturedProducts, useTrendingProducts } from '@/hooks/use-products';

export default function Home() {
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedProducts(8);
  const { data: trendingData, isLoading: trendingLoading } = useTrendingProducts(8);

  const featuredProducts = featuredData?.data || [];
  const trendingProducts = trendingData?.data || [];

  return (
    <MainLayout>
      <div className="space-y-0">
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Products */}
        <section className="py-16 md:py-24">
          <div className="container">
            <ProductCarousel
              title="Featured Products"
              products={featuredProducts}
              isLoading={featuredLoading}
            />
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