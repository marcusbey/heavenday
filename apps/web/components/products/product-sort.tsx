'use client';

import { ChevronDown } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import type { ProductSort as SortType } from '@heaven-dolls/types';
import { useState, useRef, useEffect } from 'react';

interface ProductSortProps {
  sort: SortType;
  onSortChange: (sort: SortType) => void;
}

const sortOptions = [
  { label: 'Newest', value: { field: 'createdAt' as const, direction: 'desc' as const } },
  { label: 'Oldest', value: { field: 'createdAt' as const, direction: 'asc' as const } },
  { label: 'Price: Low to High', value: { field: 'price' as const, direction: 'asc' as const } },
  { label: 'Price: High to Low', value: { field: 'price' as const, direction: 'desc' as const } },
  { label: 'Most Popular', value: { field: 'purchaseCount' as const, direction: 'desc' as const } },
  { label: 'Highest Rated', value: { field: 'averageRating' as const, direction: 'desc' as const } },
  { label: 'Trending', value: { field: 'trendingScore' as const, direction: 'desc' as const } },
  { label: 'Name: A to Z', value: { field: 'name' as const, direction: 'asc' as const } },
  { label: 'Name: Z to A', value: { field: 'name' as const, direction: 'desc' as const } },
];

export function ProductSort({ sort, onSortChange }: ProductSortProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSortLabel = sortOptions.find(
    option => option.value.field === sort.field && option.value.direction === sort.direction
  )?.label || 'Sort';

  const handleSortSelect = (newSort: SortType) => {
    onSortChange(newSort);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[140px] justify-between"
      >
        Sort: {currentSortLabel}
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 w-56 rounded-md border bg-popover shadow-lg">
          <div className="p-1">
            {sortOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSortSelect(option.value)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}