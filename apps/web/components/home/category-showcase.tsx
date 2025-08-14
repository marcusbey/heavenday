'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, Button, Skeleton } from '@heaven-dolls/ui';
import { useFeaturedCategories } from '@/hooks/use-categories';
import type { Category } from '@heaven-dolls/types';

export function CategoryShowcase() {
  const { data: categoriesData, isLoading } = useFeaturedCategories();
  const categories = categoriesData?.data || [];

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explore Our Collections
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover carefully curated categories designed to meet every preference and desire
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <CategorySkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.slice(0, 6).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" asChild>
            <Link href="/categories">
              View All Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const { name, slug, shortDescription, image, productCount } = category.attributes;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <Link href={`/categories/${slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image?.data && (
            <Image
              src={image.data.attributes.url}
              alt={name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          
          {/* Category Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">{name}</h3>
            {shortDescription && (
              <p className="text-sm opacity-90 line-clamp-2 mb-3">
                {shortDescription}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-75">
                {productCount} {productCount === 1 ? 'Product' : 'Products'}
              </span>
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function CategorySkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
    </Card>
  );
}