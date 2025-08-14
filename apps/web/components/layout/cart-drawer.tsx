'use client';

import { Fragment } from 'react';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@heaven-dolls/ui';
import Image from 'next/image';
import Link from 'next/link';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  if (!isOpen) return null;

  // Mock cart data - replace with actual cart state
  const cartItems = [];
  const cartTotal = 0;
  const cartCount = 0;

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      
      {/* Cart Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-96 bg-background border-l shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="font-semibold">
              Shopping Cart {cartCount > 0 && `(${cartCount})`}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">
              Start shopping to fill your cart with amazing products!
            </p>
            <Button onClick={onClose} asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Mock cart item - replace with actual cart items */}
              <div className="flex gap-4 p-4 border rounded-lg">
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted">
                  {/* Product image placeholder */}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">Product Name</h4>
                  <p className="text-sm text-muted-foreground">Size: M</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">1</span>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">$99.99</p>
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="border-t p-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <Button className="w-full" size="lg">
                  Checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={onClose} asChild>
                  <Link href="/cart">View Cart</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}