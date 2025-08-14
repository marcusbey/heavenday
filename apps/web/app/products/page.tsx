'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ProductGrid } from '@/components/products/product-grid';
import { ProductFilters } from '@/components/products/product-filters';
import { ProductSort } from '@/components/products/product-sort';
import { Pagination } from '@/components/ui/pagination';
import { useProducts } from '@/hooks/use-products';
import type { ExtendedProductFilters, ProductSort as SortType } from '@heaven-dolls/types';
import { Button } from '@heaven-dolls/ui';
import { Filter, Grid, List } from 'lucide-react';

export default function ProductsPage() {
  const [filters, setFilters] = useState<ExtendedProductFilters>({});
  const [sort, setSort] = useState<SortType>({ field: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const pageSize = 12;
  
  // Combine filters with sort
  const queryFilters = useMemo(() => ({ ...filters, sort }), [filters, sort]);
  
  const { data, isLoading, error } = useProducts(queryFilters, page, pageSize);
  
  const products = data?.data || [];
  const pagination = data?.meta.pagination;
  const totalPages = pagination?.pageCount || 1;
  const totalProducts = pagination?.total || 0;

  const handleFilterChange = (newFilters: ExtendedProductFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleSortChange = (newSort: SortType) => {
    setSort(newSort);
    setPage(1); // Reset to first page when sort changes
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Products</h1>
          <p className="text-muted-foreground">
            Discover our complete collection of premium products
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className={`
            ${showFilters ? 'block' : 'hidden'} 
            lg:block w-full lg:w-64 flex-shrink-0
          `}>
            <div className="sticky top-24">
              <ProductFilters
                filters={filters}
                onFiltersChange={handleFilterChange}
                className="lg:border-r lg:pr-8"
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 pb-4 border-b">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                
                {/* Results Count */}
                <p className="text-sm text-muted-foreground">
                  {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sort */}
                <ProductSort sort={sort} onSortChange={handleSortChange} />
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-destructive">
                  Failed to load products. Please try again.
                </p>
              </div>
            )}

            {/* Products Grid */}
            <ProductGrid
              products={products}
              isLoading={isLoading}
              columns={viewMode === 'grid' ? 3 : 1}
              className={viewMode === 'list' ? 'grid-cols-1' : ''}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </MainLayout>
  );
}