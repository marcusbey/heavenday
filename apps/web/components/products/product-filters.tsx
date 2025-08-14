'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button, Input, Badge, Separator } from '@heaven-dolls/ui';
import { useCategories } from '@/hooks/use-categories';
import type { ExtendedProductFilters } from '@heaven-dolls/types';
import { cn } from '@heaven-dolls/ui';

interface ProductFiltersProps {
  filters: ExtendedProductFilters;
  onFiltersChange: (filters: ExtendedProductFilters) => void;
  className?: string;
}

export function ProductFilters({
  filters,
  onFiltersChange,
  className,
}: ProductFiltersProps) {
  const [priceRange, setPriceRange] = useState({
    min: filters.priceRange?.[0]?.toString() || '',
    max: filters.priceRange?.[1]?.toString() || '',
  });

  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];

  const handleCategoryChange = (categorySlug: string) => {
    const newFilters = { ...filters };
    if (newFilters.category === categorySlug) {
      delete newFilters.category;
    } else {
      newFilters.category = categorySlug;
    }
    onFiltersChange(newFilters);
  };

  const handlePriceRangeApply = () => {
    const min = priceRange.min ? parseFloat(priceRange.min) : undefined;
    const max = priceRange.max ? parseFloat(priceRange.max) : undefined;
    
    const newFilters = { ...filters };
    if (min !== undefined && max !== undefined && min <= max) {
      newFilters.priceRange = [min, max];
    } else if (min !== undefined) {
      newFilters.priceRange = [min, 10000]; // Set a high upper bound
    } else if (max !== undefined) {
      newFilters.priceRange = [0, max];
    } else {
      delete newFilters.priceRange;
    }
    
    onFiltersChange(newFilters);
  };

  const handleRatingFilter = (rating: number) => {
    const newFilters = { ...filters };
    if (newFilters.rating === rating) {
      delete newFilters.rating;
    } else {
      newFilters.rating = rating;
    }
    onFiltersChange(newFilters);
  };

  const handleToggleFilter = (key: keyof ExtendedProductFilters) => {
    const newFilters = { ...filters };
    if (newFilters[key]) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = true;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setPriceRange({ min: '', max: '' });
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <span className="font-medium">Active Filters</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {filters.category}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleCategoryChange(filters.category!)}
              />
            </Badge>
          )}
          {filters.priceRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              ${filters.priceRange[0]} - ${filters.priceRange[1]}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const newFilters = { ...filters };
                  delete newFilters.priceRange;
                  onFiltersChange(newFilters);
                  setPriceRange({ min: '', max: '' });
                }}
              />
            </Badge>
          )}
          {filters.rating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {filters.rating}+ Stars
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRatingFilter(filters.rating!)}
              />
            </Badge>
          )}
        </div>
      )}

      <Separator />

      {/* Categories */}
      <div>
        <h3 className="font-medium mb-3">Categories</h3>
        <div className="space-y-2">
          {categories.slice(0, 8).map((category) => (
            <label
              key={category.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.category === category.attributes.slug}
                onChange={() => handleCategoryChange(category.attributes.slug)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">
                {category.attributes.name}
                {category.attributes.productCount > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({category.attributes.productCount})
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="font-medium mb-3">Price Range</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Max"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            />
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handlePriceRangeApply}>
            Apply
          </Button>
        </div>
      </div>

      <Separator />

      {/* Rating */}
      <div>
        <h3 className="font-medium mb-3">Minimum Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filters.rating === rating}
                onChange={() => handleRatingFilter(rating)}
                className="rounded border-gray-300"
              />
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    )}
                  />
                ))}
                <span className="text-sm text-muted-foreground">& up</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Availability */}
      <div>
        <h3 className="font-medium mb-3">Availability</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.inStock}
              onChange={() => handleToggleFilter('inStock')}
              className="rounded border-gray-300"
            />
            <span className="text-sm">In Stock Only</span>
          </label>
        </div>
      </div>

      <Separator />

      {/* Special Features */}
      <div>
        <h3 className="font-medium mb-3">Special Features</h3>
        <div className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.featured}
              onChange={() => handleToggleFilter('featured')}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Featured Products</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters.trending}
              onChange={() => handleToggleFilter('trending')}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Trending Products</span>
          </label>
        </div>
      </div>
    </div>
  );
}