'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Input, Button } from '@heaven-dolls/ui';
import { useSearchProducts } from '@/hooks/use-products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Image from 'next/image';
import Link from 'next/link';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { data: searchResults, isLoading } = useSearchProducts(
    debouncedQuery,
    undefined,
    { enabled: debouncedQuery.length >= 2 }
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 2);
  };

  const products = searchResults?.data || [];
  const hasResults = products.length > 0;

  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSearch} className="relative">
        <Input
          type="search"
          placeholder="Search for products..."
          value={query}
          onChange={handleInputChange}
          className="w-full pl-10 pr-4"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border rounded-lg shadow-lg max-h-96 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : hasResults ? (
            <>
              <div className="p-2 border-b">
                <p className="text-sm font-medium">Products</p>
              </div>
              {products.slice(0, 6).map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.attributes.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                  }}
                >
                  <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted">
                    {product.attributes.mainImage?.data && (
                      <Image
                        src={product.attributes.mainImage.data.attributes.url}
                        alt={product.attributes.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product.attributes.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${product.attributes.price}
                    </p>
                  </div>
                </Link>
              ))}
              {products.length > 6 && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(query)}`);
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    View all {products.length} results
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No products found for &quot;{debouncedQuery}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}