'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MainLayout } from '@/components/layout/main-layout';
import { ProductGrid } from '@/components/products/product-grid';
import { ProductFilters } from '@/components/products/product-filters';
import { ProductSort } from '@/components/products/product-sort';
import { Pagination } from '@/components/ui/pagination';
import { useCategory } from '@/hooks/use-categories';
import { useProducts } from '@/hooks/use-products';
import { useState, useMemo } from 'react';
import { Button, Skeleton } from '@heaven-dolls/ui';
import { Filter, Grid, List } from 'lucide-react';
import type { ExtendedProductFilters, ProductSort as SortType } from '@heaven-dolls/types';

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const [filters, setFilters] = useState<ExtendedProductFilters>({ category: params.slug });
  const [sort, setSort] = useState<SortType>({ field: 'createdAt', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const pageSize = 12;
  
  const { data: categoryData, isLoading: categoryLoading, error: categoryError } = useCategory(params.slug);
  
  // Combine filters with sort and category
  const queryFilters = useMemo(() => ({ 
    ...filters, 
    category: params.slug, // Ensure category is always set
    sort 
  }), [filters, sort, params.slug]);
  
  const { data: productsData, isLoading: productsLoading } = useProducts(queryFilters, page, pageSize);
  
  if (categoryError && !categoryLoading) {
    notFound();
  }

  const category = categoryData?.data;
  const products = productsData?.data || [];
  const pagination = productsData?.meta.pagination;
  const totalPages = pagination?.pageCount || 1;
  const totalProducts = pagination?.total || 0;

  const handleFilterChange = (newFilters: ExtendedProductFilters) => {
    setFilters({ ...newFilters, category: params.slug });
    setPage(1);
  };

  const handleSortChange = (newSort: SortType) => {
    setSort(newSort);
    setPage(1);
  };

  if (categoryLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <CategoryPageSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!category) {
    notFound();
  }

  const { name, description, shortDescription, banner, image } = category.attributes;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground">Home</a>
          <span className="mx-2">/</span>
          <a href="/categories" className="hover:text-foreground">Categories</a>
          <span className="mx-2">/</span>
          <span className="text-foreground">{name}</span>
        </nav>

        {/* Category Hero */}
        <div className="mb-12">
          {banner?.data && (
            <div className="relative h-48 md:h-64 rounded-lg overflow-hidden mb-6">
              <Image
                src={banner.data.attributes.url}
                alt={name}
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute bottom-6 left-6 text-white">
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{name}</h1>
                {shortDescription && (
                  <p className="text-lg opacity-90 max-w-2xl">{shortDescription}</p>
                )}
              </div>
            </div>
          )}

          {!banner?.data && (
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{name}</h1>
              {shortDescription && (
                <p className="text-xl text-muted-foreground max-w-2xl">{shortDescription}</p>
              )}
            </div>
          )}

          {description && (
            <div 
              className="prose prose-gray max-w-none mb-8"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
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
                  {totalProducts} {totalProducts === 1 ? 'product' : 'products'} in {name}
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

            {/* Products Grid */}
            <ProductGrid
              products={products}
              isLoading={productsLoading}
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

function CategoryPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero Skeleton */}
      <div>
        <Skeleton className="h-48 md:h-64 w-full rounded-lg mb-6" />
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Content Skeleton */}
      <div className="flex gap-8">
        <div className="w-64 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-12 w-full mb-6" />
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}