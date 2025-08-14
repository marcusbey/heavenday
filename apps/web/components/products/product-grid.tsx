import { ProductCard } from './product-card';
import { ProductCardSkeleton } from './product-card-skeleton';
import type { Product } from '@heaven-dolls/types';
import { cn } from '@heaven-dolls/ui';

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
  showWishlist?: boolean;
  showQuickAdd?: boolean;
}

export function ProductGrid({
  products,
  isLoading = false,
  className,
  columns = 4,
  showWishlist = true,
  showQuickAdd = true,
}: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  if (isLoading) {
    return (
      <div className={cn("grid gap-6", gridCols[columns], className)}>
        {Array.from({ length: 12 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-6", gridCols[columns], className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showWishlist={showWishlist}
          showQuickAdd={showQuickAdd}
        />
      ))}
    </div>
  );
}