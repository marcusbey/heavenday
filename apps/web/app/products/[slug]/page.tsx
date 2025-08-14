'use client';

import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { ImageGallery } from '@/components/products/image-gallery';
import { ProductCarousel } from '@/components/products/product-carousel';
import { AddToCartSection } from '@/components/products/add-to-cart-section';
import { ProductReviews } from '@/components/products/product-reviews';
import { ProductSpecifications } from '@/components/products/product-specifications';
import { useProduct } from '@/hooks/use-products';
import { Button, Badge, Separator, Skeleton } from '@heaven-dolls/ui';
import { Heart, Share2, Star, TrendingUp, Shield, Truck } from 'lucide-react';
import { cn } from '@heaven-dolls/ui';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const { data, isLoading, error } = useProduct(params.slug);

  if (error && !isLoading) {
    notFound();
  }

  const product = data?.data;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <ProductDetailSkeleton />
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    notFound();
  }

  const {
    name,
    description,
    shortDescription,
    price,
    originalPrice,
    discountPercentage,
    images,
    mainImage,
    category,
    brand,
    tags,
    averageRating,
    reviewCount,
    stockQuantity,
    trending,
    featured,
    specifications,
    materials,
    careInstructions,
    relatedProducts,
  } = product.attributes;

  const isDiscounted = originalPrice && originalPrice > price;
  const isOutOfStock = stockQuantity <= 0;
  const allImages = [mainImage?.data, ...(images?.data || [])].filter(Boolean);

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground">Home</a>
          <span className="mx-2">/</span>
          <a href="/products" className="hover:text-foreground">Products</a>
          {category?.data && (
            <>
              <span className="mx-2">/</span>
              <a 
                href={`/categories/${category.data.attributes.slug}`}
                className="hover:text-foreground"
              >
                {category.data.attributes.name}
              </a>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground">{name}</span>
        </nav>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div>
            <ImageGallery 
              images={allImages} 
              productName={name}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {trending && (
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}
              {featured && <Badge>Featured</Badge>}
              {isDiscounted && (
                <Badge variant="destructive">
                  -{Math.round(discountPercentage || 0)}% OFF
                </Badge>
              )}
            </div>

            {/* Title and Brand */}
            <div>
              {brand?.data && (
                <p className="text-sm text-muted-foreground mb-2">
                  {brand.data.attributes.name}
                </p>
              )}
              <h1 className="text-3xl font-bold mb-4">{name}</h1>
            </div>

            {/* Rating */}
            {averageRating && reviewCount > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= Math.floor(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <a 
                  href="#reviews" 
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </a>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold">${price}</span>
              {isDiscounted && (
                <span className="text-xl text-muted-foreground line-through">
                  ${originalPrice}
                </span>
              )}
            </div>

            {/* Short Description */}
            {shortDescription && (
              <p className="text-muted-foreground text-lg">{shortDescription}</p>
            )}

            <Separator />

            {/* Add to Cart */}
            <AddToCartSection 
              product={product}
              isOutOfStock={isOutOfStock}
            />

            {/* Actions */}
            <div className="flex gap-4">
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Add to Wishlist
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Secure & Discreet Packaging</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Free Shipping on Orders Over $75</span>
              </div>
            </div>

            {/* Tags */}
            {tags?.data && tags.data.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {tags.data.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.attributes.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="space-y-12">
          {/* Description */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Product Description</h2>
            <div 
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </section>

          {/* Specifications */}
          {(specifications?.length || materials?.length) && (
            <ProductSpecifications 
              specifications={specifications}
              materials={materials}
              careInstructions={careInstructions}
            />
          )}

          {/* Reviews */}
          <ProductReviews productId={product.id} />

          {/* Related Products */}
          {relatedProducts?.data && relatedProducts.data.length > 0 && (
            <section>
              <ProductCarousel
                title="Related Products"
                products={relatedProducts.data}
              />
            </section>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Images Skeleton */}
      <div>
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>

      {/* Info Skeleton */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}