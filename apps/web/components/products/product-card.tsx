'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@heaven-dolls/ui';
import type { Product } from '@heaven-dolls/types';
import { cn } from '@heaven-dolls/ui';

interface ProductCardProps {
  product: Product;
  className?: string;
  showWishlist?: boolean;
  showQuickAdd?: boolean;
}

export function ProductCard({
  product,
  className,
  showWishlist = true,
  showQuickAdd = true,
}: ProductCardProps) {
  const {
    name,
    slug,
    price,
    originalPrice,
    discountPercentage,
    mainImage,
    averageRating,
    reviewCount,
    trending,
    featured,
    stockQuantity,
  } = product.attributes;

  const isDiscounted = originalPrice && originalPrice > price;
  const isOutOfStock = stockQuantity <= 0;

  return (
    <Card className={cn("group overflow-hidden transition-all duration-300 hover:shadow-lg", className)}>
      <div className="relative">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Link href={`/products/${slug}`}>
            {mainImage?.data && (
              <Image
                src={mainImage.data.attributes.url}
                alt={name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )}
          </Link>
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {trending && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
            {featured && (
              <Badge variant="default" className="text-xs">
                Featured
              </Badge>
            )}
            {isDiscounted && (
              <Badge variant="destructive" className="text-xs">
                -{Math.round(discountPercentage || 0)}%
              </Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="text-xs">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          {showWishlist && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart className="h-4 w-4" />
            </Button>
          )}

          {/* Quick Add Button */}
          {showQuickAdd && !isOutOfStock && (
            <Button
              size="sm"
              className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          {/* Product Info */}
          <div className="space-y-2">
            <Link href={`/products/${slug}`} className="block">
              <h3 className="font-medium text-sm line-clamp-2 hover:text-brand-600 transition-colors">
                {name}
              </h3>
            </Link>

            {/* Rating */}
            {averageRating && reviewCount > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        star <= Math.floor(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">({reviewCount})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">${price}</span>
              {isDiscounted && (
                <span className="text-muted-foreground text-sm line-through">
                  ${originalPrice}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}