'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ShoppingBag, Heart, Menu, X, User } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import { useCategories } from '@/hooks/use-categories';
import { SearchBar } from './search-bar';
import { MobileMenu } from './mobile-menu';
import { CartDrawer } from './cart-drawer';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { data: categories } = useCategories();

  const navigationCategories = categories?.data?.filter(
    cat => cat.attributes.showInNavigation && cat.attributes.level === 0
  )?.slice(0, 6);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 lg:mr-8">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient" />
          <span className="text-xl font-bold tracking-tight">Heaven Dolls</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex lg:flex-1">
          <ul className="flex items-center space-x-8">
            <li>
              <Link
                href="/products"
                className="text-sm font-medium transition-colors hover:text-brand-600"
              >
                All Products
              </Link>
            </li>
            {navigationCategories?.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.attributes.slug}`}
                  className="text-sm font-medium transition-colors hover:text-brand-600"
                >
                  {category.attributes.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/trending"
                className="text-sm font-medium transition-colors hover:text-brand-600"
              >
                Trending
              </Link>
            </li>
          </ul>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm mx-4 lg:mx-8">
          <SearchBar />
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2">
          {/* Wishlist */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCartOpen(true)}
            className="relative"
          >
            <ShoppingBag className="h-5 w-5" />
            {/* Cart Count Badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-600 text-xs text-white flex items-center justify-center">
              0
            </span>
          </Button>

          {/* User Menu */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={navigationCategories}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}