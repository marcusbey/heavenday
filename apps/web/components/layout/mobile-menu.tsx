'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import type { Category } from '@heaven-dolls/types';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
}

export function MobileMenu({ isOpen, onClose, categories }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed left-0 top-0 z-50 h-full w-80 bg-background border-r shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-brand-gradient" />
            <span className="font-bold">Heaven Dolls</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-auto h-full pb-20">
          <nav className="p-4 space-y-2">
            <Link
              href="/products"
              className="flex items-center justify-between p-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={onClose}
            >
              All Products
              <ChevronRight className="h-4 w-4" />
            </Link>

            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.attributes.slug}`}
                className="flex items-center justify-between p-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                onClick={onClose}
              >
                {category.attributes.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}

            <Link
              href="/trending"
              className="flex items-center justify-between p-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              onClick={onClose}
            >
              Trending
              <ChevronRight className="h-4 w-4" />
            </Link>

            <div className="pt-4 border-t">
              <Link
                href="/wishlist"
                className="flex items-center justify-between p-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                onClick={onClose}
              >
                Wishlist
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/account"
                className="flex items-center justify-between p-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                onClick={onClose}
              >
                Account
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </Fragment>
  );
}