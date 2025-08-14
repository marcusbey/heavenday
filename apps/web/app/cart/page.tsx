'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Button, Separator } from '@heaven-dolls/ui';
import { ShoppingBag, Trash2, Plus, Minus, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Mock cart data - replace with actual cart state management
const mockCartItems = [
  {
    id: '1',
    product: {
      id: 1,
      attributes: {
        name: 'Premium Silk Collection Item',
        slug: 'premium-silk-item',
        price: 99.99,
        mainImage: {
          data: {
            attributes: {
              url: '/api/placeholder/300/300',
            }
          }
        }
      }
    },
    variant: null,
    quantity: 2,
    price: 99.99
  },
  {
    id: '2',
    product: {
      id: 2,
      attributes: {
        name: 'Elegant Design Collection',
        slug: 'elegant-design-collection',
        price: 149.99,
        mainImage: {
          data: {
            attributes: {
              url: '/api/placeholder/300/300',
            }
          }
        }
      }
    },
    variant: {
      id: 1,
      attributes: {
        name: 'Rose Gold - Large',
        price: 149.99
      }
    },
    quantity: 1,
    price: 149.99
  }
];

export default function CartPage() {
  const cartItems = mockCartItems;
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 75 ? 0 : 9.99;
  const total = subtotal + shipping;

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    // TODO: Implement quantity change
    console.log('Quantity change:', itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: string) => {
    // TODO: Implement item removal
    console.log('Remove item:', itemId);
  };

  const handleMoveToWishlist = (itemId: string) => {
    // TODO: Implement move to wishlist
    console.log('Move to wishlist:', itemId);
  };

  if (cartItems.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-muted-foreground mb-6">
              Start shopping to fill your cart with amazing products!
            </p>
            <Button asChild>
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                {/* Product Image */}
                <div className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.product.attributes.mainImage?.data?.attributes.url || '/placeholder.jpg'}
                    alt={item.product.attributes.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/products/${item.product.attributes.slug}`}
                    className="font-medium hover:text-brand-600 line-clamp-2"
                  >
                    {item.product.attributes.name}
                  </Link>
                  
                  {item.variant && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.variant.attributes.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center border rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 p-0 rounded-r-none"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="h-8 w-12 flex items-center justify-center border-x text-sm">
                        {item.quantity}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 rounded-l-none"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price} each
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => handleMoveToWishlist(item.id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Heart className="h-4 w-4" />
                      Save for later
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="border rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {shipping === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {shipping > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add ${(75 - subtotal).toFixed(2)} more for free shipping
                    </p>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>

                <div className="text-center">
                  <Link 
                    href="/products"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>Free returns within 30 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>Discreet packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}