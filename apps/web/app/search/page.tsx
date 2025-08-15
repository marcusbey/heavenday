'use client';

import { useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { ProductGrid } from '@/components/products/product-grid';
import { ProductFilters } from '@/components/products/product-filters';
import { ProductSort } from '@/components/products/product-sort';
import { Pagination } from '@/components/ui/pagination';
import { useSearchProducts } from '@/hooks/use-products';
import { useState, useMemo } from 'react';
import { Button } from '@heaven-dolls/ui';
import { Filter, Grid, List, Search } from 'lucide-react';
import type { ExtendedProductFilters, ProductSort as SortType } from '@heaven-dolls/types';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  
  const [filters, setFilters] = useState<ExtendedProductFilters>({});
  const [sort, setSort] = useState<SortType>({ field: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const pageSize = 12;
  
  // Combine filters with sort and search query
  const queryFilters = useMemo(() => ({ 
    ...filters, 
    searchQuery: query,
    sort 
  }), [filters, sort, query]);
  
  const { data, isLoading, error } = useSearchProducts(query, queryFilters);
  
  const products = data?.data || [];
  const pagination = data?.meta.pagination;
  const totalPages = pagination?.pageCount || 1;
  const totalProducts = pagination?.total || 0;

  const handleFilterChange = (newFilters: ExtendedProductFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleSortChange = (newSort: SortType) => {
    setSort(newSort);
    setPage(1);
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Search Results</h1>
          </div>
          
          {query && (
            <div className="mb-4">
              <p className="text-muted-foreground">
                Showing results for: <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
              </p>
              {totalProducts > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalProducts} {totalProducts === 1 ? 'result' : 'results'} found
                </p>
              )}
            </div>
          )}

          {!query && (
            <p className="text-muted-foreground">
              Enter a search term to find products
            </p>
          )}
        </div>

        {query && (
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
                    {totalProducts} {totalProducts === 1 ? 'result' : 'results'}
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
                    Failed to search products. Please try again.
                  </p>
                </div>
              )}

              {/* No Results */}
              {!isLoading && !error && query && products.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your search terms or browse our categories
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" asChild>
                      <a href="/products">Browse All Products</a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/categories">Browse Categories</a>
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Suggestions */}
              {!isLoading && !error && query && products.length === 0 && (
                <div className="mt-8 p-6 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-3">Search Suggestions:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Check your spelling</li>
                    <li>• Use fewer or different keywords</li>
                    <li>• Try more general terms</li>
                    <li>• Browse our categories for inspiration</li>
                  </ul>
                </div>
              )}

              {/* Products Grid */}
              {(query && products.length > 0) && (
                <ProductGrid
                  products={products}
                  isLoading={isLoading}
                  columns={viewMode === 'grid' ? 3 : 1}
                  className={viewMode === 'list' ? 'grid-cols-1' : ''}
                />
              )}

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
        )}
      </div>
    </MainLayout>
  );
}