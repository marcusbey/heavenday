'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import { ProductCard } from './product-card';
import { ProductCardSkeleton } from './product-card-skeleton';
import type { Product } from '@heaven-dolls/types';
import { cn } from '@heaven-dolls/ui';

interface ProductCarouselProps {
  title?: string;
  products: Product[];
  isLoading?: boolean;
  className?: string;
  showNavigation?: boolean;
  itemsPerView?: number;
}

export function ProductCarousel({
  title,
  products,
  isLoading = false,
  className,
  showNavigation = true,
  itemsPerView = 4,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollLeft = () => {
    if (scrollRef.current) {
      const itemWidth = scrollRef.current.scrollWidth / (products.length || 1);
      const scrollAmount = itemWidth * itemsPerView;
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const itemWidth = scrollRef.current.scrollWidth / (products.length || 1);
      const scrollAmount = itemWidth * itemsPerView;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const displayItems = isLoading ? Array.from({ length: 8 }) : products;

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          {showNavigation && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={scrollLeft}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={scrollRight}
                disabled={!canScrollRight}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayItems.map((product, index) => (
          <div
            key={isLoading ? index : product.id}
            className="flex-none w-64 sm:w-72"
          >
            {isLoading ? (
              <ProductCardSkeleton />
            ) : (
              <ProductCard product={product as Product} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}