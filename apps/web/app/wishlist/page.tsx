'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ProductGrid } from '@/components/products/product-grid';
import { Button } from '@/ui-components/button';
import { Heart, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

// Mock wishlist data - replace with actual wishlist state management
const mockWishlistItems: any[] = [];

export default function WishlistPage() {
  const wishlistItems = mockWishlistItems;

  if (wishlistItems.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16">
          <div className="max-w-md mx-auto text-center">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
            <p className="text-muted-foreground mb-6">
              Save items you love to view them later and never lose track of what you want.
            </p>
            <div className="space-y-3">
              <Link href="/products">
                <Button>Start Shopping</Button>
              </Link>
              <div>
                <Link 
                  href="/trending" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Browse trending products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/products">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
            <Button>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Add All to Cart
            </Button>
          </div>
        </div>

        {/* Wishlist Items */}
        <ProductGrid 
          products={wishlistItems} 
          columns={4}
          showWishlist={true}
          showQuickAdd={true}
        />

        {/* Recommendations */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">You might also like</h2>
          <p className="text-muted-foreground mb-8">
            Based on items in your wishlist
          </p>
          
          {/* This would show recommended products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Placeholder for recommended products */}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}